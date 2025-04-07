/**
 * Generates a JSON-RPC payload to retrieve detailed employee information from Odoo's `hr.employee` model.
 * This payload is designed for the `web_read` method, which retrieves specified fields for a given employee ID.
 * The payload includes contextual settings (e.g., language, timezone) and a detailed field specification.
 * 
 * @param {number} employeeId - The unique ID of the employee whose data is to be retrieved.
 * @returns {Object} A JSON-RPC payload object compatible with Odoo's RPC framework.
 */

export function createEmployeePayload(employeeId) {
    return {
        // Specifies the JSON-RPC protocol version, ensuring compatibility with Odoo's RPC system
        jsonrpc: "2.0",

        // The RPC method to invoke; "call" is the standard entry point for Odoo RPC requests
        method: "call",

        // Parameters object containing all details of the RPC call
        params: {
            // The Odoo model to query; "hr.employee" stores employee-related data
            model: "hr.employee",

            // The specific method to call on the model; "web_read" retrieves detailed data optimized for the web client
            method: "web_read",

            // Arguments for the "web_read" method; expects a list of IDs (double array) to fetch data for
            args: [[employeeId]],

            // Keyword arguments providing additional configuration for the request
            kwargs: {
                // Contextual settings influencing how data is returned (e.g., language, timezone)
                context: {
                    // Language code for field labels and error messages (e.g., "en_US" for English)
                    lang: "en_US",

                    // Timezone for formatting date/time fields (e.g., "Africa/Casablanca")
                    tz: "Africa/Casablanca",

                    // User ID of the requester; hardcoded here but should be dynamic in a real application
                    uid: 447,

                    // List of company IDs the user can access; restricts data visibility (should be dynamic based on permissions)
                    allowed_company_ids: [11],

                    // When true, binary fields (e.g., images) return their size in bytes instead of raw data, reducing payload size
                    bin_size: true,

                    // UI-specific parameters used by Odoo's web client to maintain state and navigation
                    params: {
                        // ID of the action being performed (e.g., opening an employee view)
                        action: 445,

                        // Model being viewed; mirrors the top-level "model" property
                        model: "hr.employee",

                        // Type of view to render (e.g., "kanban", "form", "list")
                        view_type: "kanban",

                        // Current company ID; aligns with "allowed_company_ids"
                        cids: 11,

                        // Menu ID for navigation context (e.g., HR menu item)
                        menu_id: 304
                    },

                    // Boolean flag to include a chat icon in the UI (likely for Odoo’s chat feature)
                    chat_icon: true
                },

                // Defines which fields to retrieve from the "hr.employee" model and their subfields (if relational)
                specification: {
                    // **Basic Fields** (no subfields required)
                    active: {},                  // Boolean: Whether the employee is active in the system
                    image_128: {},               // Binary: Small employee image (128x128 pixels)
                    last_activity_time: {},      // Datetime: Time of the employee’s last activity
                    last_activity: {},           // Date: Date of the employee’s last activity
                    ongoing_appraisal_count: {}, // Integer: Number of appraisals currently in progress
                    total_overtime: {},          // Float: Total overtime hours worked
                    contract_warning: {},        // Boolean: Indicates if there’s a contract-related issue
                    employee_type: {},           // String: Type of employee (e.g., "employee", "contractor")
                    has_slots: {},               // Boolean: Whether the employee has planning slots
                    show_leaves: {},             // Boolean: Whether leave data should be displayed
                    is_absent: {},               // Boolean: Whether the employee is currently absent
                    hr_icon_display: {},         // String: Icon to display for HR presence status
                    leave_date_to: {},           // Date: End date of the employee’s current leave
                    allocation_remaining_display: {}, // String: Display of remaining leave allocation
                    allocation_display: {},      // String: Display of total leave allocation
                    has_timesheet: {},           // Boolean: Whether timesheets are enabled for the employee
                    equipment_count: {},         // Integer: Number of equipment items assigned
                    employee_cars_count: {},     // Integer: Number of company cars assigned
                    appraisal_count: {},         // Integer: Total number of completed appraisals
                    last_appraisal_date: {},     // Date: Date of the most recent appraisal
                    has_work_entries: {},        // Boolean: Whether work entries are recorded
                    attendance_state: {},        // String: Current attendance status (e.g., "checked_in")
                    avatar_128: {},              // Binary: Employee avatar image (128x128 pixels)
                    name: {},                    // String: Full name of the employee
                    job_title: {},               // String: Employee’s job title
                    image_1920: {},              // Binary: Large employee image (1920x1920 pixels)
                    write_date: {},              // Datetime: Last update timestamp of the record
                    show_hr_icon_display: {},    // Boolean: Whether to show the HR presence icon
                    hr_presence_state: {},       // String: HR presence status (e.g., "present", "absent")
                    name_work_location_display: {}, // String: Display name of the work location
                    mobile_phone: {},            // String: Employee’s mobile phone number
                    work_phone: {},              // String: Employee’s work phone number
                    work_email: {},              // String: Employee’s work email address
                    company_country_code: {},    // String: Country code of the employee’s company
                    next_appraisal_date: {},     // Date: Date of the next scheduled appraisal
                    employee_properties: {},     // Text: Custom properties or notes about the employee
                    departure_description: {},   // Text: Description of the employee’s departure
                    departure_date: {},          // Date: Date of the employee’s departure
                    calendar_mismatch: {},       // Boolean: Indicates a mismatch in calendar settings
                    tz: {},                      // String: Employee’s timezone
                    has_badges: {},              // Boolean: Whether the employee has earned badges
                    private_street: {},          // String: Employee’s private street address
                    private_street2: {},         // String: Second line of private street address
                    private_city: {},            // String: Employee’s private city
                    private_zip: {},             // String: Employee’s private postal code
                    private_email: {},           // String: Employee’s private email address
                    private_phone: {},           // String: Employee’s private phone number
                    lang: {},                    // String: Employee’s preferred language
                    km_home_work: {},            // Float: Distance (in kilometers) from home to work
                    private_car_plate: {},       // String: License plate of the employee’s private car
                    marital: {},                 // String: Marital status (e.g., "single", "married")
                    spouse_complete_name: {},    // String: Full name of the employee’s spouse
                    spouse_birthdate: {},        // Date: Birthdate of the employee’s spouse
                    children: {},                // Integer: Number of children
                    emergency_contact: {},       // String: Name of the emergency contact
                    emergency_phone: {},         // String: Phone number of the emergency contact
                    certificate: {},             // String: Highest educational certificate (e.g., "Bachelor")
                    study_field: {},             // String: Field of study (e.g., "Computer Science")
                    study_school: {},            // String: Name of the school attended
                    visa_no: {},                 // String: Visa number (if applicable)
                    permit_no: {},               // String: Work permit number
                    visa_expire: {},             // Date: Visa expiration date
                    work_permit_expiration_date: {}, // Date: Work permit expiration date
                    work_permit_name: {},        // String: Name on the work permit
                    has_work_permit: {},         // Boolean: Whether the employee has a work permit
                    identification_id: {},       // String: Employee’s identification number
                    ssnid: {},                   // String: Social security number
                    passport_id: {},             // String: Passport number
                    gender: {},                  // String: Gender (e.g., "male", "female")
                    birthday: {},                // Date: Employee’s birthdate
                    place_of_birth: {},          // String: Employee’s place of birth
                    is_non_resident: {},         // Boolean: Whether the employee is a non-resident
                    first_contract_date: {},     // Date: Date of the employee’s first contract
                    pin: {},                     // String: PIN code (if applicable)
                    barcode: {},                 // String: Barcode identifier
                    registration_number: {},     // String: Employee registration number
                    hourly_cost: {},             // Float: Hourly cost of the employee
                    mobility_card: {},           // String: Mobility card details
                    display_name: {},            // String: Computed display name for the employee

                    // **Relational Fields** (include subfields to retrieve related data)
                    user_id: { fields: { display_name: {} } },              // Related user’s display name
                    user_partner_id: { fields: {} },                        // Related partner record
                    company_id: { fields: { display_name: {} } },           // Company’s display name
                    currency_id: { fields: { display_name: {} } },          // Currency’s display name
                    work_contact_id: { fields: {} },                        // Work contact record
                    parent_user_id: { fields: { display_name: {} } },       // Manager’s user display name
                    last_appraisal_id: { fields: {} },                      // Last appraisal record
                    category_ids: { fields: { display_name: {}, color: {} } }, // Employee categories with name and color
                    company_country_id: { fields: {} },                     // Company’s country record
                    department_id: { fields: { display_name: {} } },        // Department’s display name
                    job_id: { fields: { display_name: {} } },               // Job position’s display name
                    parent_id: { fields: { display_name: {} } },            // Manager’s display name
                    coach_id: { fields: { display_name: {} } },             // Coach’s display name
                    address_id: { 
                        fields: { display_name: {} }, 
                        context: { show_address: 1 }                        // Work address with special context for full display
                    },
                    work_location_id: { fields: {} },                       // Work location record
                    expense_manager_id: { fields: { display_name: {} } },   // Expense manager’s display name
                    leave_manager_id: { fields: { display_name: {} } },     // Leave manager’s display name
                    timesheet_manager_id: { fields: { display_name: {} } }, // Timesheet manager’s display name
                    departure_reason_id: { fields: { display_name: {} } },  // Departure reason’s display name
                    monday_location_id: { fields: { display_name: {} } },   // Monday work location’s display name
                    tuesday_location_id: { fields: { display_name: {} } },  // Tuesday work location’s display name
                    wednesday_location_id: { fields: { display_name: {} } },// Wednesday work location’s display name
                    thursday_location_id: { fields: { display_name: {} } }, // Thursday work location’s display name
                    friday_location_id: { fields: { display_name: {} } },   // Friday work location’s display name
                    saturday_location_id: { fields: { display_name: {} } }, // Saturday work location’s display name
                    sunday_location_id: { fields: { display_name: {} } },   // Sunday work location’s display name
                    resource_calendar_id: { fields: { display_name: {} } }, // Working schedule’s display name
                    planning_role_ids: { fields: { display_name: {}, color: {} } }, // Planning roles with name and color
                    default_planning_role_id: { fields: { display_name: {} } }, // Default planning role’s display name
                    child_ids: { fields: {} },                              // Subordinates’ records
                    badge_ids: {
                        fields: {
                            badge_name: {},                                 // Name of the badge
                            badge_id: { fields: { display_name: {} } },     // Badge type’s display name
                            user_id: { fields: { display_name: {} } },      // User who awarded the badge
                            comment: {},                                    // Comment associated with the badge
                            create_date: {},                                // Badge creation date
                            write_date: {},                                 // Badge last update date
                            create_uid: { fields: { display_name: {} } }    // Creator’s display name
                        },
                        limit: 40,                                          // Limits the number of badges to 40
                        order: ""                                           // No specific ordering applied
                    },
                    private_state_id: { fields: { display_name: {} } },     // Private state’s display name
                    private_country_id: { fields: { display_name: {} } },   // Private country’s display name
                    bank_account_id: { fields: { display_name: {} } },      // Bank account’s display name
                    country_id: { fields: { display_name: {} } },           // Nationality’s display name
                    country_of_birth: { fields: { display_name: {} } }      // Country of birth’s display name
                }
            }
        },

        // Unique identifier for the request; using timestamp ensures uniqueness for simplicity
        id: Date.now()
    };
}
