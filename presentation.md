# 🏗️ Auto Chiffrage Opportunités: A Systematic Overview

## 1. Introduction

**Objective:** Provide an end-to-end solution for drawing 2D architectural plans and automatically generating material cost estimates, with secure local storage and Odoo integration.

---

## 2. Core Components

| Component          | Description                                                                      |
| ------------------ | -------------------------------------------------------------------------------- |
| Drawing Interface  | Web-based canvas for sketching walls, windows, and other elements.               |
| Ubuntu Server      | Local storage for plan images, PDFs, and metadata.                               |
| Calculation Engine | Applies fire/water resistance rules and material pricing to compute total costs. |
| Odoo Integration   | Automatically creates purchase requests based on computed costs.                 |

---

## 3. Workflow Steps

1. **Plan Creation**

   * Users draw walls, openings, and structures in the browser.
2. **Asset Storage**

   * The system saves plans as images and PDFs on the Ubuntu server.
3. **Data Extraction**

   * Extract wall dimensions, material selections, and performance attributes.
4. **Cost Calculation**

   * Apply multipliers for fire resistance (`EI30`, `EI60`) and acoustic levels.
   * Calculate base panel quantities and apply material unit prices.
5. **Purchase Order Generation**

   * Create a draft purchase request in Odoo for review and approval.

---

## 4. Key Benefits

* **Speed:** From drawing to cost estimate in seconds.
* **Accuracy:** Standardized rules ensure consistent pricing.
* **Integration:** End-to-end flow from design to procurement without manual handoffs.
* **Security:** All file assets remain on-premises on our Ubuntu server.

---

## 5. Current Status & Metrics

| Task                              | Status      | Target Accuracy |
| --------------------------------- | ----------- | --------------- |
| Frontend–Backend Connection       | Completed   | N/A             |
| Asset Storage on Ubuntu Server    | Completed   | N/A             |
| Calculation Engine Implementation | In Testing  | 99%+            |
| Edge Case Validation              | In Progress | 100% Coverage   |

---

## 6. Next Steps

1. **Testing Completion**

   * Finalize edge-case scenarios with Rachid, Khalid, and the DM team.
2. **User Guide**

   * Prepare a concise manual for operations staff.
3. **Rollout**

   * Deploy to the operations team and collect feedback.
4. **Iteration**

   * Incorporate feedback and optimize performance.

---

## 7. Team & Responsibilities

| Role               | Name           | Responsibility                                    |
| ------------------ | -------------- | ------------------------------------------------- |
| Lead Developer     | Younes/Rabie3  | System architecture, integration, and core logic. |
| QA & Testing       | Rachid, Khalid | Accuracy verification and edge-case testing.      |
| Operations Liaison | DM Team        | Feedback collection and user acceptance testing.  |

---

**Thank you for your attention.**

Questions and feedback are welcome! Let’s ensure a smooth transition from drawing to procurement.
 