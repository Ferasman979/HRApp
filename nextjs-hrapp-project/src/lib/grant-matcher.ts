import { IEmployee } from "@/lib/models/Employee";
import { searchTavily } from "./tavily";

export interface GrantResult {
    cohortDescription: string;
    employees: string[]; // Names/IDs
    grants: any[];
}

export async function findGrantsForCohorts(employees: IEmployee[]): Promise<GrantResult[]> {
    // 1. Identify Cohorts based on demographics
    const cohorts: Record<string, IEmployee[]> = {};

    employees.forEach(emp => {
        const demos = emp.demographics;
        // Create a signature based on relevant grant criteria
        const keys = [];
        if (demos.gender && demos.gender !== 'Male') keys.push(demos.gender); // Focus on underrepresented
        if (demos.veteranStatus && demos.veteranStatus === 'Yes') keys.push('Veteran');
        if (demos.disability && demos.disability !== 'No') keys.push('Disability');
        if (demos.ethnicity && demos.ethnicity !== 'White') keys.push(demos.ethnicity);

        // General Tech grants if no specific demographics?
        if (keys.length === 0) keys.push('General Tech Worker');

        // Create groups. 
        // Note: An employee might belong to multiple cohorts in a real complex system. 
        // For efficiency, we group by the *combination* of traits first.
        const signature = keys.sort().join(" + ");

        if (!cohorts[signature]) cohorts[signature] = [];
        cohorts[signature].push(emp);
    });

    // 2. Execute Search per Cohort
    const results: GrantResult[] = [];

    for (const [signature, group] of Object.entries(cohorts)) {
        // Construct query
        const query = `Grants and funding for ${signature} employees in technology sector Canada`; // Assuming Canada/Tech context from history

        const grants = await searchTavily(query);

        results.push({
            cohortDescription: signature,
            employees: group.map(e => e.name),
            grants: grants
        });
    }

    return results;
}
