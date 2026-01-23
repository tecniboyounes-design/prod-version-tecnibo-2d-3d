export const configuratorData = {
  "id": 12,
  "cpId": "T100",
  "description": "Standard linear division",
  "createdAt": "2024-07-08T12:34:56Z",
  "updatedAt": "2024-07-12T08:21:30Z",
  "sections": [
    {
      "id": 101,
      "label": "Default settings",
      "type": "DEFAULT",
      "description": null,
      "order": 1,
      "fields": [
        {
          "id": 1001,
          "name": "sampleDimension",
          "type": "INPUT",
          "label": "Sample Dimension",
          "info": null,
          "required": true,
          "order": 1,
          "details": {
            "min": 100,
            "max": 2000,
            "validation": "integer",
            "default": 500,
            "unit": "mm"
          },
          "impactedVariables": ["DoorHeight"],
          "dependencies": []
        }
      ],
      "subSections": []
    },
    {
      "id": 102,
      "label": "Conditions",
      "type": "TREE",
      "order": 2,
      "fields": [],
      "conditionRows": [
        {
          "id": 3001,
          "parentId": null,
          "order": 1,
          "rowType": "group",
          "junction": "And",
          "children": [
            {
              "id": 3002,
              "rowType": "condition",
              "lhs": "Door height",
              "operator": "Equal",
              "rhs": 200,
              "description": "desc 1"
            }
          ]
        }
      ]
    }
  ]
};

export default configuratorData;