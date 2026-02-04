import { searchTavily } from "./tavily";

export interface Employee {
    id: string;
    email: string;
    data: any; // Dynamic JSON
}

export interface GrantResult {
    cohortDescription: string;
    employees: string[]; // Names/IDs
    grants: any[];
}

export async function findGrantsForCohorts(employees: Employee[]): Promise<GrantResult[]> {
    // 1. Identify Cohorts based on demographics
    const cohorts: Record<string, Employee[]> = {};

    employees.forEach(emp => {
        const data = emp.data || {};
        const keys = [];

        // Privacy-safe extraction: Only pull known demographic keywords
        // PII Safeguard: Explicitly ignore name, email, phone, address, id, etc.
        // We look for values that might be relevant to grants (gender, veteran, disability, ethnicity)
        // This is a naive heuristic matching. In production, mapping or ML would be better.

        for (const [key, value] of Object.entries(data)) {
            const k = key.toLowerCase();
            const v = String(value).toLowerCase();

            // Skip PII keys
            if (['name', 'email', 'phone', 'address', 'id', 'sin', 'ssn', 'role', 'title'].includes(k)) continue;

            // Heuristics for grant-relevant traits
            if (v === 'female' || v === 'woman') keys.push('Female');
            if (v === 'veteran' || v === 'yes' && k.includes('veteran')) keys.push('Veteran');
            if (v !== 'no' && k.includes('disability')) keys.push('Disability');
            if (['asian', 'black', 'indigenous', 'latino', 'hispanic'].some(t => v.includes(t))) keys.push(String(value));
        }

        // General Tech grants if no specific demographics?
        if (keys.length === 0) keys.push('General Tech Worker');

        // Create groups. 
        const signature = keys.sort().join(" + ");

        if (!cohorts[signature]) cohorts[signature] = [];
        cohorts[signature].push(emp);
    });

    // 2. Execute Search per Cohort
    const results: GrantResult[] = [];

    for (const [signature, group] of Object.entries(cohorts)) {
        // Construct query - Strict Template ensuring only signature traits are used
        const query = `Grants and funding for ${signature} employees in technology sector Canada`;

        const grants = await searchTavily(query);

        results.push({
            cohortDescription: signature,
            employees: group.map(e => e.data?.name || e.email), // Display name/email in UI result, but NOT in query
            grants: grants
        });
    }

    return results;
}
