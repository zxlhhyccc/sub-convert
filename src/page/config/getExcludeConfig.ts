import { Exclude } from '../../shared/exclude';

export function getExcludeConfig(): { label: string; value: string }[] {
    return new Exclude().excludeRules.map(rule => ({ label: rule.label, value: rule.value }));
}

