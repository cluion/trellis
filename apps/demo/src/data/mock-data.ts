export interface User {
  [key: string]: unknown;
  id: number;
  name: string;
  email: string;
  age: number;
  role: string;
  city: string;
  joinDate: string;
}

export const mockUsers: User[] = [
  { id: 1, name: 'Alice Chen', email: 'alice@example.com', age: 28, role: 'Engineer', city: '台北', joinDate: '2023-01-15' },
  { id: 2, name: 'Bob Lin', email: 'bob@example.com', age: 35, role: 'Manager', city: '台中', joinDate: '2022-06-20' },
  { id: 3, name: 'Carol Wu', email: 'carol@example.com', age: 24, role: 'Designer', city: '高雄', joinDate: '2023-09-01' },
  { id: 4, name: 'David Huang', email: 'david@example.com', age: 42, role: 'Director', city: '台北', joinDate: '2020-03-10' },
  { id: 5, name: 'Eva Tsai', email: 'eva@example.com', age: 31, role: 'Engineer', city: '新竹', joinDate: '2023-04-22' },
  { id: 6, name: 'Frank Lee', email: 'frank@example.com', age: 27, role: 'Engineer', city: '台北', joinDate: '2024-01-08' },
  { id: 7, name: 'Grace Wang', email: 'grace@example.com', age: 38, role: 'PM', city: '台中', joinDate: '2021-11-30' },
  { id: 8, name: 'Henry Liu', email: 'henry@example.com', age: 29, role: 'Designer', city: '高雄', joinDate: '2023-07-14' },
  { id: 9, name: 'Iris Yang', email: 'iris@example.com', age: 33, role: 'Engineer', city: '台北', joinDate: '2022-02-28' },
  { id: 10, name: 'Jack Chen', email: 'jack@example.com', age: 26, role: 'QA', city: '新竹', joinDate: '2024-03-05' },
  { id: 11, name: 'Karen Hsu', email: 'karen@example.com', age: 45, role: 'VP', city: '台北', joinDate: '2019-08-12' },
  { id: 12, name: 'Leo Chang', email: 'leo@example.com', age: 30, role: 'Engineer', city: '台中', joinDate: '2023-05-18' },
  { id: 13, name: 'Mia Lin', email: 'mia@example.com', age: 23, role: 'Intern', city: '高雄', joinDate: '2024-06-01' },
  { id: 14, name: 'Nick Wu', email: 'nick@example.com', age: 36, role: 'Manager', city: '台北', joinDate: '2021-01-20' },
  { id: 15, name: 'Olivia Huang', email: 'olivia@example.com', age: 29, role: 'Engineer', city: '新竹', joinDate: '2023-12-10' },
  { id: 16, name: 'Paul Tsai', email: 'paul@example.com', age: 41, role: 'Director', city: '台中', joinDate: '2020-07-15' },
  { id: 17, name: 'Quinn Lee', email: 'quinn@example.com', age: 25, role: 'QA', city: '台北', joinDate: '2024-02-14' },
  { id: 18, name: 'Ruby Wang', email: 'ruby@example.com', age: 34, role: 'PM', city: '高雄', joinDate: '2022-10-01' },
  { id: 19, name: 'Steve Liu', email: 'steve@example.com', age: 32, role: 'Engineer', city: '台北', joinDate: '2023-08-22' },
  { id: 20, name: 'Tina Yang', email: 'tina@example.com', age: 28, role: 'Designer', city: '新竹', joinDate: '2024-01-30' },
  { id: 21, name: 'Uma Chen', email: 'uma@example.com', age: 39, role: 'Manager', city: '台中', joinDate: '2021-06-08' },
  { id: 22, name: 'Victor Hsu', email: 'victor@example.com', age: 22, role: 'Intern', city: '台北', joinDate: '2024-07-01' },
  { id: 23, name: 'Wendy Chang', email: 'wendy@example.com', age: 37, role: 'Engineer', city: '高雄', joinDate: '2022-04-15' },
  { id: 24, name: 'Xavier Lin', email: 'xavier@example.com', age: 44, role: 'VP', city: '台北', joinDate: '2019-12-20' },
  { id: 25, name: 'Yuki Wu', email: 'yuki@example.com', age: 26, role: 'Designer', city: '新竹', joinDate: '2024-04-12' },
];

export const columns = [
  { id: 'id', accessor: 'id' as const, header: 'ID', sortable: true, width: 60, align: 'center' as const },
  { id: 'name', accessor: 'name' as const, header: '姓名', sortable: true },
  { id: 'email', accessor: 'email' as const, header: 'Email' },
  { id: 'age', accessor: 'age' as const, header: '年齡', sortable: true, width: 80, align: 'center' as const },
  { id: 'role', accessor: 'role' as const, header: '職位', sortable: true },
  { id: 'city', accessor: 'city' as const, header: '城市', sortable: true },
  { id: 'joinDate', accessor: 'joinDate' as const, header: '入職日期', sortable: true },
];
