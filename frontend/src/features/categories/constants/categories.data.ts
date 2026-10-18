import type { Category } from "../types/category.types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "1",
    name: "Technical Support",
    description: "Technical issues and system errors",
    subCategories: [
      { id: "1", categoryId: "1", name: "Login Issues", description: "Login and authentication problems" },
      { id: "2", categoryId: "1", name: "Software Bug / Crash", description: "System crashes or unexpected errors" },
      { id: "3", categoryId: "1", name: "Performance Issue", description: "Slow response times or latency" },
    ],
  },
  {
    id: "2",
    name: "Account & Access",
    description: "User account and permission requests",
    subCategories: [
      { id: "4", categoryId: "2", name: "Password Reset", description: "Help with forgotten or locked password" },
      { id: "5", categoryId: "2", name: "Role & Permissions", description: "Request elevated permissions" },
    ],
  },
  {
    id: "3",
    name: "Billing & Invoicing",
    description: "Invoices, payments and refunds",
    subCategories: [
      { id: "6", categoryId: "3", name: "Invoice Query", description: "Questions regarding invoices" },
      { id: "7", categoryId: "3", name: "Payment Failure", description: "Payment processing errors" },
    ],
  },
  {
    id: "4",
    name: "Hardware & IT Support",
    description: "Equipment, network and workstations",
    subCategories: [
      { id: "8", categoryId: "4", name: "Network & VPN", description: "Connectivity or VPN issues" },
      { id: "9", categoryId: "4", name: "Hardware Malfunction", description: "Damaged or faulty equipment" },
    ],
  },
  {
    id: "5",
    name: "Feature Request",
    description: "Product enhancements and feedback",
    subCategories: [
      { id: "10", categoryId: "5", name: "UI / UX Improvement", description: "Usability suggestions" },
      { id: "11", categoryId: "5", name: "New Integration", description: "Requests for third-party integrations" },
    ],
  },
];
