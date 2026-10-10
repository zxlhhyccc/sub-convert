/**
 * Clash 合并逻辑的大规模性能基准（vitest benchmark）。
 *
 * 运行：`pnpm bench`（内部走 `vitest bench`）。
 *
 * 说明：
 * - vitest 5 的 `bench` 不是顶层导出，而是「测试上下文 fixture」：
 *     test(name, async ({ bench }) => { await bench(...).run() })
 *   它只能由 `vitest bench` 以独立的 benchmark 项目运行（普通 `vitest run` 会直接报错），
 *   且文件名要匹配默认的 benchmark.include（`*.bench.ts` 已满足）。
 * - 场景数据走 vitest fixture（`test.extend` + `test.override`）：
 *     scenario 由每个 describe 用 `it.override` 切换，raw 依赖 scenario 惰性构造，
 *     benchmark 直接从上下文解构 { bench, raw } 取用，不在用例体里手工 build。
 * - 直接调用私有方法 mergeClashConfig（内部会解析 YAML 并合并），排除网络开销，
 *   测得的就是「每次请求在 Worker 里实际消耗的 CPU 工作」。
 * - 每个场景用 bench.compare 同时压测「仅解析」与「解析+合并」，
 *   对比表里的差值即可估算「纯合并」耗时，判断瓶颈在解析还是合并。
 */
import { dump, load } from 'js-yaml';
import { describe, it } from 'vitest';
import { ClashClient } from '../../../src/core/confuse/client/clash';

interface Scenario {
    subs: number;
    nodesPerSub: number;
    groups: number;
}

/**
 * 构造单份订阅配置：nodesPerSub 个唯一节点；groups 个分组，
 * 每个分组都列出该订阅的全部节点名（最坏情况：组合并需遍历所有引用）。
 */
function buildConfig(subIndex: number, nodesPerSub: number, groups: number): Record<string, any> {
    const proxies: Array<Record<string, any>> = [];
    const nodeNames: string[] = [];
    for (let i = 0; i < nodesPerSub; i++) {
        const name = `sub${subIndex}-node${i}`;
        nodeNames.push(name);
        proxies.push({
            name,
            type: 'ss',
            server: `10.${subIndex & 255}.${(i >> 8) & 255}.${i & 255}`,
            port: 443,
            cipher: 'aes-128-gcm',
            password: 'password'
        });
    }

    // 同名分组（GROUP-0..n）跨订阅出现，触发按组名合并 + 组内去重
    const proxyGroups = Array.from({ length: groups }, (_, g) => ({
        name: `GROUP-${g}`,
        type: 'select',
        proxies: [...nodeNames]
    }));

    return { mode: 'rule', rules: ['MATCH,GROUP-0'], proxies, 'proxy-groups': proxyGroups };
}

function buildRawConfigs(sc: Scenario): string[] {
    const raw: string[] = [];
    for (let s = 0; s < sc.subs; s++) {
        raw.push(dump(buildConfig(s, sc.nodesPerSub, sc.groups)));
    }
    return raw;
}

const SCENARIOS: Scenario[] = [
    { subs: 5, nodesPerSub: 200, groups: 15 },
    { subs: 10, nodesPerSub: 500, groups: 15 },
    { subs: 20, nodesPerSub: 500, groups: 15 },
    { subs: 20, nodesPerSub: 1000, groups: 15 }
];

const client = new ClashClient();
// mergeClashConfig 是 TS private，运行时可访问；它会清空入参数组，故每次传副本
const merge = (raw: string[]): unknown => (client as unknown as { mergeClashConfig: (r: string[]) => unknown }).mergeClashConfig(raw);

// benchmark 运行参数：先预热再按时间预算采样（重场景会自然采到更少的样本）
const RUN_OPTIONS = { time: 1000, warmupTime: 100, warmupIterations: 3 } as const;

const PARSE = '仅解析';
const MERGE = '解析+合并';

function ms(value: number): string {
    return `${value.toFixed(2)}ms`;
}

// vitest fixture：scenario（每个 describe 用 it.override 切换）+ 依赖它惰性构造的 raw。
// 这样 benchmark 用例体只解构 { bench, raw }，不再在里面手工 buildRawConfigs。
const benchIt = it
    .extend('scenario', SCENARIOS[0]!)
    .extend('raw', ({ scenario }) => buildRawConfigs(scenario));

describe('clash 合并性能基准（Node 环境，已排除网络开销）', () => {
    for (const sc of SCENARIOS) {
        const total = sc.subs * sc.nodesPerSub;
        const title = `${sc.subs} 订阅 × ${sc.nodesPerSub} 节点 × ${sc.groups} 分组（合计 ${total} 节点，分组引用 ${total * sc.groups} 条）`;

        describe(title, () => {
            // 本场景的 scenario fixture 覆盖值 → raw 据此构造
            benchIt.override('scenario', sc);

            benchIt('解析 vs 解析+合并', async ({ bench, raw }) => {
                // bench.compare 会一起运行并返回结果；latency 单位 ms，throughput 单位 ops/s
                // bench 是 vitest5 的上下文 fixture（非 test/it），compare 是它的方法，这里不是测试块
                // eslint-disable-next-line test/consistent-test-it
                const results = await bench.compare(
                    bench(PARSE, () => {
                        for (const item of raw) {
                            load(item);
                        }
                    }),
                    bench(MERGE, () => {
                        // merge 会清空入参数组，故每次迭代传数组副本
                        merge(raw.slice());
                    }),
                    RUN_OPTIONS
                );

                // 自己打印一份汇总：差值 ≈ 纯合并耗时（TTY 下 vitest 还会额外渲染对比表）
                const parse = results.get(PARSE);
                const mergeRes = results.get(MERGE);
                const mergeOnly = Math.max(0, mergeRes.latency.mean - parse.latency.mean);

                console.log(`\n▶ ${title}`);
                console.log(`   仅解析     : avg ${ms(parse.latency.mean)}  (min ${ms(parse.latency.min)} / p50 ${ms(parse.latency.p50)} / max ${ms(parse.latency.max)})`);
                console.log(`   解析+合并  : avg ${ms(mergeRes.latency.mean)}  (min ${ms(mergeRes.latency.min)} / p50 ${ms(mergeRes.latency.p50)} / max ${ms(mergeRes.latency.max)})  ${mergeRes.throughput.mean.toFixed(1)} ops/s`);
                console.log(`   纯合并(估) : ~${ms(mergeOnly)}  (约占 ${((mergeOnly / mergeRes.latency.mean) * 100).toFixed(0)}%)`);
            });
        });
    }
});
