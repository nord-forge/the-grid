export type Person = {
  id: string;
  name: string;
  team: string;
  role: string;
  status: string;
  budget: number;
};

export const teams = ['Engineering', 'Design', 'Operations', 'Product'];
export const statuses = ['Active', 'On leave', 'Invited'];

const names = ['Alex Morgan', 'Sam Chen', 'Robin De Smet', 'Jamie Park', 'Casey Laurent', 'Taylor Jacobs', 'Noor Peeters', 'Charlie Williams', 'Luca Rossi', 'Drew Kim', 'Morgan Dubois', 'Avery Patel'];
const roles = ['Developer', 'Designer', 'Team lead', 'Specialist'];
const statusCycle = ['Active', 'Active', 'On leave', 'Invited'];

export function makeRows(count: number): Person[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `person-${index + 1}`,
    name: names[index % names.length]!,
    team: teams[index % teams.length]!,
    role: roles[Math.floor(index / 3) % roles.length]!,
    status: statusCycle[Math.floor(index / 2) % statusCycle.length]!,
    budget: 1200 + ((index * 173) % 4800),
  }));
}
