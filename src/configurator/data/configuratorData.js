export const configuratorData ={
    "id": 1,
    "cp_id": "LINEAR_DIV_STD",
    "description": "Standard linear division for interior design",
    "created_at": "2024-07-08T12:34:56Z",
    "updated_at": "2024-07-12T08:21:30Z",
    "sections": [
      {
        "id": 101,
        "label": "Default Settings",
        "type": "DEFAULT",
        "description": "General setup fields for this configurator",
        "order_index": 1,
        "fields": [
          {
            "id": 201,
            "name": "door_width",
            "type": "INPUT",
            "label": "Door Width",
            "info": "Width of the main door in mm",
            "required": true,
            "order_index": 1,
            "descriptions": [
              { 
                "lang": "en", 
                "description": "Min 500mm, Max 2000mm"
              }
            ],
            "input_details": {
              "min": 500,
              "max": 2000,
              "type": "number",
              "validation": "integer",
              "default_value": "1000",
              "attributes": "unit:mm"
            },
            "impacted_variables": ["DoorHeight"],
            "dependencies": []
          }
        ],
    
        "subSections": [
          {
            "id": 2011,
            "label": "Advanced Defaults",
            "type": "DEFAULT",
            "description": "More advanced default options",
            "order_index": 1,
            "fields": [
              {
                "id": 301,
                "name": "internal_spacing",
                "type": "INPUT",
                "label": "Internal Spacing",
                "required": false,
                "order_index": 1,
                "input_details": {
                  "min": 10,
                  "max": 100,
                  "type": "number",
                  "validation": "float",
                  "default_value": "20",
                  "attributes": "unit:mm"
                }
              }
            ],
            "subSections": [
              {
                "id": 3011,
                "label": "Sub-sub Defaults",
                "type": "DEFAULT",
                "description": "Deep nested config",
                "order_index": 1,
                "fields": [
                  {
                    "id": 401,
                    "name": "tolerance_margin",
                    "type": "INPUT",
                    "label": "Tolerance Margin",
                    "order_index": 1,
                    "input_details": {
                      "min": 0,
                      "max": 10,
                      "type": "number",
                      "default_value": "1"
                    }
                  }
                ],
                "subSections": []
              }
            ]
          }
        ]
      },
      {
        "id": 102,
        "label": "Conditions",
        "type": "TREE",
        "description": "Rules and conditional logic to apply",
        "order_index": 2,
        "fields": [],
        "condition_tree": {
          "id": 600,
          "comment": "Top-level logic gate",
          "operations": [
            { "termnum": 1, "parent_termnum": null, "operation_type": "AND" }
          ],
          "comparisons": [
            {
              "left_value": "material",
              "right_value": "glass",
              "termnum": 2,
              "parent_termnum": 1,
              "comparison_type": "Equal"
            },
            {
              "left_value": "width",
              "right_value": "1000",
              "termnum": 3,
              "parent_termnum": 1,
              "comparison_type": "Greater"
            }
          ]
        }
      },
      {
        "id": 103,
        "label": "Usage",
        "type": "USAGE",
        "description": "Where and how to apply settings",
        "order_index": 3,
        "fields": []
      }
    ]
}