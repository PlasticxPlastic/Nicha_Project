# PRD: Venio Customer Service Issue Insight Dashboard

## 1. Product Overview

### 1.1 Product Name

**Venio Customer Service Issue Insight Dashboard**

### 1.2 Product Type

Local web-based issue reporting and insight dashboard.

### 1.3 Target Users

Customer Service team members who need to review Venio issue data, identify product/service pain points, and prepare feedback reports for the project/product team.

### 1.4 Product Purpose

The app helps the Customer Service team convert raw Venio issue CSV data into clear operational visibility and product feedback.

The main goal is to answer:

> What should the Customer Service team tell the Venio product/project team to improve?

The app focuses on:

* Identifying issues that stay pending too long.
* Identifying priority issues that are not handled fast enough.
* Identifying which issue types should be improved in the product.
* Identifying which bugs or problems happen most often.
* Identifying which customers are affected the most.
* Generating summary reports for monthly or two-week feedback cycles.

### 1.5 Product Scope

This is not intended to replace Jira or become a full ticket management system. It is a lightweight local dashboard for viewing, analyzing, filtering, categorizing, and exporting Venio issue data.

---

## 2. Background and Problem Statement

The Customer Service team receives or exports issue data in CSV format. While the raw data contains useful fields such as issue status, priority, customer code, report date, resolved date, pending age, and time to solve, it is difficult to quickly understand:

* Which issues are still pending and require follow-up.
* Which high-priority issues have been left unresolved too long.
* Which types of product problems happen repeatedly.
* Which Venio modules or categories are affected most often.
* Which customers experience the most issues.
* Which issues took too long to resolve.
* What feedback should be presented to the product/project team.

The current CSV data is useful but not directly presentation-ready. The Customer Service team needs a visual dashboard and exportable report that can summarize issues in a meaningful way.

---

## 3. Goals and Objectives

### 3.1 Business Goals

* Improve visibility of Venio issue trends.
* Help CS communicate product pain points clearly to the project/product team.
* Reduce manual effort in preparing issue feedback reports.
* Highlight long-pending and slow-handled issues.
* Identify common problem areas in Venio.

### 3.2 User Goals

Customer Service users should be able to:

* Upload a Venio issue CSV manually.
* View issues in a Kanban-style board by status category.
* Filter issues by multiple dimensions.
* Identify high-priority pending issues quickly.
* Identify issues pending over configurable thresholds.
* See issue analytics and charts.
* Automatically classify issues into Venio product categories.
* Manually correct issue categories when needed.
* Export PDF and Excel reports for project/product feedback.

### 3.3 Success Criteria

The product is successful when:

* The CS team can clearly see all pending issues.
* The CS team can identify which issues are delayed or slow to resolve.
* The CS team can understand which Venio categories have the most problems.
* The CS team can identify which customers are most affected.
* The CS team can prepare feedback reports without manually analyzing CSV data.
* The product/project team receives clear insight into what needs improvement.

---

## 4. Non-Goals

The MVP will not include:

* Jira API integration.
* Real-time synchronization.
* User login.
* User roles or permissions.
* Drag-and-drop issue status updates.
* Editing imported issue fields, except manual category correction and comments/notes.
* Creating new issues manually.
* Assigning issues to users.
* Scheduled reports.
* Notifications or alerts.
* Mobile-first experience.
* Cloud deployment.
* AI/API-based category detection in MVP.

---

## 5. Users and Personas

### 5.1 Primary Persona: Customer Service Team Member

**Role:** Reviews issue data and prepares feedback for the Venio product/project team.

**Needs:**

* Quickly understand current issue situation.
* Find long-pending or high-priority issues.
* See which customers and Venio areas are affected.
* Export a clean report.

**Pain Points:**

* Raw CSV data is difficult to analyze manually.
* Repeated issues are hard to summarize.
* Product feedback requires manual preparation.
* Issue categories are not directly provided in the CSV.

### 5.2 Secondary Persona: CS Lead / Manager

**Role:** Reviews issue performance and presents summary feedback.

**Needs:**

* Executive summary.
* Charts and breakdowns.
* Monthly or two-week comparison.
* Clear list of product improvement points.

---

## 6. Data Source and Import

### 6.1 Data Input Method

Users manually upload a CSV file.

### 6.2 CSV Format

The CSV format is expected to stay the same.

Expected fields:

* Summary
* Issue key
* Issue Type
* Status
* Project name
* Project type
* Priority
* Description
* Custom field (Customer Code)
* Status Category
* Report Date
* Last Updated Date
* Resolved Date (Proxy)
* Time to Solve (hrs)
* Pending Age (hrs)

### 6.3 Data Refresh

Data refreshes only when the user uploads a new CSV.

### 6.4 Data Storage

The app stores uploaded data in SQLite.

### 6.5 Upload History

Although the dashboard shows the latest upload by default, historical upload data should be stored to support comparison by report date.

### 6.6 Report Date Usage

The app uses `Report Date` from the CSV to calculate reporting periods and comparisons.

### 6.7 Duplicate Handling

The app should detect duplicate issues by `Issue key`.

Recommended handling:

* If the same `Issue key` exists in a new upload, the latest imported version should replace or update the previous record.
* Upload history should still be traceable by import batch.

---

## 7. Core Functional Requirements

## 7.1 CSV Upload

### Description

Users can upload a Venio issue CSV file manually.

### Requirements

* User can select and upload a CSV file.
* App validates required columns.
* App shows import result summary:

  * Total rows imported.
  * Valid rows.
  * Skipped rows.
  * Duplicate issue keys.
  * Import date/time.
* App stores imported data in SQLite.
* App uses the latest upload as the default dashboard view.

### Acceptance Criteria

* Given a valid CSV, when the user uploads it, the app imports the data successfully.
* Given a CSV missing required columns, the app shows a clear validation error.
* Given duplicate issue keys, the app handles them according to the duplicate handling rule.

---

## 7.2 Dashboard Overview

### Description

The dashboard provides a high-level summary of the latest Venio issue data.

### Summary Cards

The dashboard should show:

* Total issues
* Open issues
* Resolved issues
* High-priority issues
* Pending over 36 hours
* Critical pending over 72 hours
* Average time to solve
* Average pending age
* Oldest pending issue
* Most affected customer
* Most common issue type
* Most common Venio category

### Acceptance Criteria

* Dashboard metrics update after CSV upload.
* Metrics respect active filters.
* Users can reset filters to return to the full dataset.

---

## 7.3 Kanban Board

### Description

Issues are displayed in a Kanban-style board using `Status Category` as the main column grouping.

### Columns

Columns are based on `Status Category`, such as:

* To Do
* In Progress
* Done
* Other, if unknown or unmapped

### Requirements

* No drag-and-drop.
* No status editing.
* Cards are view-only.
* Cards are clickable and open issue details.

### Card Fields

Each issue card should show:

* Issue key
* Summary
* Issue Type
* Status
* Status Category
* Project name
* Project type
* Priority
* Customer Code
* Report Date
* Last Updated Date
* Resolved Date
* Time to Solve
* Pending Age
* Venio category

### Visual Highlighting

Cards should visually indicate:

* High/Highest priority
* Pending over 36 hours
* Pending over 72 hours
* Slow resolution time
* Missing category confidence

### Acceptance Criteria

* Issues are grouped by `Status Category`.
* Clicking an issue opens the issue detail modal.
* Cards visually highlight overdue pending items.

---

## 7.4 Issue Detail Modal

### Description

A user can click an issue card or table row to view full issue details.

### Fields Displayed

The detail modal should show:

* Summary
* Issue key
* Issue Type
* Status
* Status Category
* Project name
* Project type
* Priority
* Description
* Customer Code
* Report Date
* Last Updated Date
* Resolved Date
* Time to Solve
* Pending Age
* Venio category
* Category confidence or matching rule
* Internal CS notes/comments

### Requirements

* Imported issue fields are read-only.
* User can add internal notes/comments.
* User can manually correct Venio category.
* Manual category correction should be saved locally.

### Acceptance Criteria

* Imported fields cannot be edited.
* Category can be corrected manually.
* Notes can be added and viewed later.

---

## 7.5 Filters and Search

### Description

Users can filter issues for analysis and reporting.

### Filter Fields

The app should support filtering by:

* Project name
* Project type
* Issue Type
* Status
* Status Category
* Priority
* Customer Code
* Report Date range
* Last Updated Date range
* Resolved Date range
* Time to Solve range
* Pending Age range
* Solved / Unsolved
* Overdue / Not overdue
* Venio category
* Keyword search in Summary and Description

### Multi-Select Support

Filters must support multiple values at the same time.

Example:

* Priority = High + Highest
* Status = Pending + Open
* Venio category = Report + Quotation + Customer

### Saved Filter Presets

The app should include these saved filters:

* High Priority Pending
* Over 36 Hours Pending
* Over 24 Hours Pending

### Global Search

The app should include global search for:

* Issue key
* Summary
* Description
* Customer Code
* Venio category

### Sorting

Users can sort issues by:

* Newest report date
* Oldest report date
* Longest pending age
* Highest priority
* Longest time to solve
* Latest updated
* Customer Code
* Issue Type
* Venio category

### Acceptance Criteria

* Filters can be combined.
* Filtered results update dashboard, board, charts, and exports.
* Saved filter presets apply instantly.
* Search works across issue key, summary, description, and customer code.

---

## 7.6 Venio Category Detection

### Description

The app automatically classifies issues into Venio product categories based on Summary and Description.

### Venio Categories

The supported categories are:

* Activity Plan
* Customer
* Team
* Expense
* Case
* Deal
* Quotation
* Sales Order
* Contract
* Campaign
* Product
* Sales Page
* Chat
* Report
* Setting
* Contact

### MVP Approach

Use Option A + B:

* Option A: Rule-based keyword matching.
* Option B: Manual category correction.

### Rule-Based Detection

The app checks `Summary` and `Description` for keywords in English and Thai.

Example rules:

* `quotation`, `quote`, `เสนอราคา` → Quotation
* `expense`, `ค่าใช้จ่าย`, `เบิก` → Expense
* `report`, `รายงาน`, `export` → Report
* `customer`, `ลูกค้า` → Customer
* `contract`, `สัญญา` → Contract
* `chat`, `แชท`, `message` → Chat
* `setting`, `ตั้งค่า` → Setting
* `contact`, `ผู้ติดต่อ` → Contact
* `sales order`, `SO`, `ใบสั่งขาย` → Sales Order
* `campaign`, `แคมเปญ` → Campaign
* `deal`, `opportunity` → Deal
* `case`, `ticket` → Case
* `product`, `สินค้า` → Product
* `activity plan`, `แผนกิจกรรม` → Activity Plan
* `team`, `ทีม` → Team
* `sales page` → Sales Page

### Category Confidence

The app should show category confidence levels:

* High: strong exact keyword match.
* Medium: partial or related keyword match.
* Low: weak match or multiple possible categories.
* Uncategorized: no matching rule.

### Manual Correction

Users can manually correct the detected category.

Manual corrections should:

* Override auto-detection.
* Be saved in SQLite.
* Be included in exports.
* Be used as feedback for improving future keyword rules if possible.

### Acceptance Criteria

* Each imported issue receives a suggested Venio category.
* Users can manually correct the category.
* Corrected categories appear in dashboard charts and exports.

---

## 7.7 Analytics and Charts

### Description

Charts help CS understand issue trends and product feedback points.

### Required Charts

The dashboard should include:

1. Issues by Status Category

   * Shows distribution of To Do, In Progress, Done, etc.

2. Issues by Priority

   * Shows issue severity distribution.

3. Issues by Issue Type

   * Helps identify what type of issue happens most often.

4. Issues by Venio Category

   * Shows which Venio product areas need improvement.

5. Issues by Customer Code

   * Shows which customers are most affected.

6. Issues by Project Name

   * Useful if multiple project names exist in the data.

7. Reported Issues Over Time

   * Uses `Report Date`.

8. Resolved Issues Over Time

   * Uses `Resolved Date (Proxy)`.

9. Average Time to Solve by Venio Category

   * Helps identify product areas that take longest to resolve.

10. Average Pending Age by Venio Category

* Helps identify currently stuck product areas.

11. Slowest Resolved Issues

* Table or chart of issues with longest `Time to Solve (hrs)`.

12. Longest Pending Issues

* Table or chart of issues with longest `Pending Age (hrs)`.

13. 2-Week vs 2-Week Comparison

* Uses `Report Date` to compare two periods.

### Acceptance Criteria

* Charts update based on active filters.
* Charts are suitable for CS/product feedback context.
* Users can export chart summaries in PDF.

---

## 7.8 Threshold Rules

### Description

The app uses configurable thresholds to identify delayed issues.

### Default Thresholds

| Metric                        |    Warning |   Critical |
| ----------------------------- | ---------: | ---------: |
| Pending Age                   | > 36 hours | > 72 hours |
| Time to Solve                 | > 36 hours | > 72 hours |
| High/Highest Priority Pending | > 36 hours | > 72 hours |

### Requirements

* Thresholds should be configurable in the app settings.
* Updated thresholds should immediately affect dashboard metrics, card highlighting, charts, and exports.
* Threshold settings are stored locally.

### Acceptance Criteria

* User can edit warning and critical thresholds.
* Dashboard recalculates based on updated thresholds.

---

## 7.9 2-Week vs 2-Week Comparison

### Description

The app supports comparison between two periods using `Report Date`.

### Comparison Logic

Because uploads are not scheduled, comparison should not depend on upload timing. Instead, comparison should be based on issue `Report Date`.

### Example

If user selects a target period:

* Current period: May 16–31
* Previous period: May 1–15

The app compares:

* Total issues
* Pending issues
* Resolved issues
* High-priority pending issues
* Average time to solve
* Average pending age
* Issues by Venio category
* Issues by customer
* Issues by issue type

### Acceptance Criteria

* User can select a date range for comparison.
* App automatically calculates the previous equal-length period.
* Comparison results can be included in PDF and Excel exports.

---

## 7.10 Feedback Summary Generation

### Description

The app generates an automatic summary that CS can use as product/project feedback.

### Example Output

> This period contains 100 issues. The most common Venio category is Report, followed by Quotation and Customer. 12 issues are still pending, and 5 have been pending for more than 36 hours. High-priority pending issues should be reviewed first. Customer C001 is the most affected customer. The product team should prioritize improvements in the Report and Quotation areas.

### Requirements

The summary should include:

* Total issues.
* Pending issue count.
* Long-pending issue count.
* Critical pending issue count.
* Most common Venio categories.
* Most affected customers.
* Most common issue types.
* Slowest resolved areas.
* Suggested product improvement focus.

### Acceptance Criteria

* Summary updates based on active filters and selected report period.
* Summary appears in dashboard and PDF export.
* Summary is bilingual or supports English primary with Thai secondary labels.

---

## 7.11 Export Reports

### Description

Users can export reports in PDF and Excel.

### Export Types

* PDF summary report.
* Excel detailed report.

### PDF Report Structure

1. Executive Summary
2. Key Issue Insights
3. Pending Too Long
4. High-Priority Issues Not Handled Fast Enough
5. Most Common Bug/Issue Types
6. Venio Category Breakdown
7. Most Affected Customers
8. Slowest Resolved Issues
9. 2-Week vs 2-Week Comparison
10. Product Feedback Recommendations
11. Detailed Issue Appendix

### Excel Report Structure

Recommended sheets:

1. Summary
2. All Issues
3. Pending Issues
4. High Priority Pending
5. Over 36 Hours Pending
6. Venio Category Breakdown
7. Customer Breakdown
8. Issue Type Breakdown
9. Slowest Resolved Issues
10. Comparison

### Requirements

* Export respects active filters.
* Export includes manually corrected categories.
* Export includes threshold-based warning/critical labels.
* Export includes report date range.

### Acceptance Criteria

* User can export PDF.
* User can export Excel.
* Exported reports match current filtered view.

---

## 8. UI/UX Requirements

### 8.1 Design Direction

The UI should be optimized for Customer Service reporting, not developer ticket management.

Recommended style:

* Clean analytics dashboard.
* Jira-like issue clarity.
* Kanban board for operational visibility.
* Report-focused layout for presentation.
* Dense but readable desktop-first interface.

### 8.2 Language

English primary, Thai secondary.

Example:

* `Pending Issues / งานที่ยังค้าง`
* `Most Affected Customers / ลูกค้าที่ได้รับผลกระทบมากที่สุด`
* `Venio Category / หมวดหมู่ Venio`

### 8.3 Thai Text Support

The app must support Thai text in:

* Summary
* Description
* Customer-related fields
* Filters
* Search
* PDF export
* Excel export

### 8.4 Dark Mode

The app should support dark mode.

### 8.5 Desktop Only

The MVP targets desktop usage only.

Minimum recommended screen width: 1366px.

### 8.6 Main Pages

The app should include:

1. Upload Page

   * CSV upload
   * Validation result
   * Import history

2. Dashboard Page

   * Summary cards
   * Charts
   * Feedback summary
   * Comparison section

3. Board Page

   * Kanban board by Status Category
   * Filter panel
   * Search
   * Sort

4. Issue Table Page

   * Detailed tabular view
   * Advanced filtering
   * Export actions

5. Settings Page

   * Threshold configuration
   * Category keyword rules
   * Dark mode toggle

---

## 9. Data Model

### 9.1 Issue

| Field                 | Type              | Description                               |
| --------------------- | ----------------- | ----------------------------------------- |
| id                    | integer           | Internal ID                               |
| issue_key             | text              | Original issue key                        |
| summary               | text              | Issue summary                             |
| issue_type            | text              | Issue type                                |
| status                | text              | Current status                            |
| status_category       | text              | Main Kanban grouping                      |
| project_name          | text              | Project name                              |
| project_type          | text              | Project type                              |
| priority              | text              | Issue priority                            |
| description           | text              | Full issue description                    |
| customer_code         | text              | Customer code                             |
| report_date           | datetime          | Report date from CSV                      |
| last_updated_date     | datetime          | Last updated date from CSV                |
| resolved_date         | datetime nullable | Resolved date proxy                       |
| time_to_solve_hours   | decimal nullable  | Time to solve                             |
| pending_age_hours     | decimal nullable  | Pending age                               |
| venio_category_auto   | text              | Auto-detected Venio category              |
| venio_category_manual | text nullable     | Manually corrected category               |
| venio_category_final  | text              | Manual category if exists, otherwise auto |
| category_confidence   | text              | High, Medium, Low, Uncategorized          |
| import_batch_id       | integer           | Related import batch                      |
| created_at            | datetime          | Local created timestamp                   |
| updated_at            | datetime          | Local updated timestamp                   |

### 9.2 Import Batch

| Field           | Type     | Description                |
| --------------- | -------- | -------------------------- |
| id              | integer  | Batch ID                   |
| filename        | text     | Uploaded CSV filename      |
| imported_at     | datetime | Upload timestamp           |
| total_rows      | integer  | Total rows in file         |
| valid_rows      | integer  | Successfully imported rows |
| skipped_rows    | integer  | Skipped rows               |
| duplicate_count | integer  | Duplicate issue key count  |
| min_report_date | datetime | Earliest report date       |
| max_report_date | datetime | Latest report date         |

### 9.3 Issue Note

| Field      | Type     | Description       |
| ---------- | -------- | ----------------- |
| id         | integer  | Note ID           |
| issue_id   | integer  | Related issue     |
| note       | text     | CS internal note  |
| created_at | datetime | Created timestamp |

### 9.4 Settings

| Field | Type | Description   |
| ----- | ---- | ------------- |
| key   | text | Setting key   |
| value | text | Setting value |

Example settings:

* pending_warning_hours = 36
* pending_critical_hours = 72
* solve_warning_hours = 36
* solve_critical_hours = 72
* dark_mode = true/false

### 9.5 Category Keyword Rule

| Field    | Type    | Description            |
| -------- | ------- | ---------------------- |
| id       | integer | Rule ID                |
| category | text    | Venio category         |
| keyword  | text    | Keyword or phrase      |
| language | text    | EN, TH, Any            |
| weight   | integer | Matching strength      |
| active   | boolean | Whether rule is active |

---

## 10. Technical Requirements

### 10.1 Recommended Stack

* Frontend: Vue 3
* Styling: Tailwind CSS
* Local backend: Node.js or lightweight local API
* Database: SQLite
* Charts: ECharts, Chart.js, or Recharts equivalent for Vue
* PDF export: Playwright print, Puppeteer, or client-side PDF generator
* Excel export: ExcelJS or equivalent

### 10.2 Deployment

* Runs on local machine.
* No cloud hosting required for MVP.
* Should be easy to start locally.

### 10.3 Suggested Local Architecture

* Vue frontend served locally.
* Backend API handles CSV parsing, SQLite storage, exports, and category detection.
* SQLite database stored on local machine.

### 10.4 Performance Expectations

The app should support at least:

* 10,000 issues locally.
* Fast filtering and searching.
* Smooth dashboard rendering.
* Export generation within reasonable local-machine time.

---

## 11. Functional User Stories

### CSV Upload

As a CS user, I want to upload a Venio issue CSV so that I can analyze the latest issue data.

### Dashboard Summary

As a CS user, I want to see total, pending, resolved, and delayed issues so that I can understand the current situation quickly.

### Kanban View

As a CS user, I want to see issues grouped by Status Category so that I can understand issue progress visually.

### Advanced Filtering

As a CS user, I want to filter by priority, status, customer, date, issue type, and Venio category so that I can focus on specific problems.

### Long Pending Detection

As a CS user, I want issues pending over 36 hours to be highlighted so that I can follow up on delayed issues.

### Category Detection

As a CS user, I want the app to auto-detect Venio categories so that I can understand which product areas have the most issues.

### Manual Category Correction

As a CS user, I want to correct the detected category so that reports are more accurate.

### Feedback Summary

As a CS user, I want the app to generate a summary of key findings so that I can present clear feedback to the project team.

### Export Report

As a CS user, I want to export PDF and Excel reports so that I can share issue insights with the product/project team.

---

## 12. MVP Scope

The first MVP should include:

* Manual CSV upload
* Required column validation
* SQLite data storage
* Upload history stored locally
* Latest upload shown by default
* Dashboard summary metrics
* Kanban board by Status Category
* No drag-and-drop
* No login
* No user roles
* No manual issue creation
* Issue detail modal
* Internal notes/comments
* Multi-filter panel
* Saved filters:

  * High Priority Pending
  * Over 36 Hours Pending
  * Over 24 Hours Pending
* Global search
* Sorting
* Venio category auto-detection
* Manual category correction
* Configurable thresholds
* Charts for status, priority, issue type, category, customer, project, trend, pending age, and solving time
* 2-week vs 2-week comparison using Report Date
* Feedback summary generation
* PDF export
* Excel export
* Dark mode
* English primary / Thai secondary UI
* Desktop-only layout
* Local machine deployment

---

## 13. Future Enhancements

Potential future improvements:

* AI-based category classification.
* Similar issue grouping.
* Root-cause clustering.
* Jira API integration.
* Scheduled imports.
* Login and user roles.
* Cloud deployment.
* Email report sharing.
* Notification for long-pending issues.
* Customer impact scoring.
* Product improvement recommendation scoring.
* Trend comparison across many months.

---

## 14. Open Questions for Future Iteration

These are not blockers for MVP but should be considered later:

1. Should category keyword rules be editable by CS users directly?
2. Should manually corrected categories improve future auto-detection?
3. Should the app support multiple Venio products later?
4. Should similar issue grouping be rule-based or AI-based?
5. Should reports include formal recommendation scoring?
6. Should the app support customer-level privacy masking in exported reports?

---

## 15. Recommended MVP Build Priority

### Phase 1: Foundation

* Local app setup
* SQLite schema
* CSV upload
* Data validation
* Basic issue table

### Phase 2: Visibility

* Dashboard metrics
* Kanban board
* Issue detail modal
* Filters and search

### Phase 3: Insight

* Threshold detection
* Venio category detection
* Manual category correction
* Charts

### Phase 4: Reporting

* Feedback summary generation
* PDF export
* Excel export
* 2-week comparison

### Phase 5: Polish

* Dark mode
* Thai text export support
* UI refinement
* Settings page

---

## 16. Final Product Definition

The Venio Customer Service Issue Insight Dashboard is a local, desktop-first web app that allows the Customer Service team to upload Venio issue CSV files, analyze pending and resolved issues, classify issues into Venio product categories, identify slow-handled and frequently occurring problems, and export clear bilingual feedback reports for the product/project team.

It is designed to help CS move from raw issue tracking to actionable product feedback.
