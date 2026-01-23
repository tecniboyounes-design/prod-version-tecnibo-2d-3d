export const backendSimulateObject = {
  id: 4,
  cpid: "CONF_DEMO_001",
  description: "Demo configurator with sections and fields",
  createdAt: "2025-07-15T09:28:54.431Z",
  updatedAt: null,
  deletedAt: null,
  sections: [
    {
      id: 1,
      type: "NONE",
      label: "Test",
      description: null,
      termnum: 3,
      parentTermnum: null,
      configuratorId: 4,
      createdAt: "2025-07-15T09:45:53.266Z",
      updatedAt: null,
      deletedAt: null,
      fields: [
        {
          id: 5,
          name: "info",
          type: "TEXT",
          label: "info",
          info: null,
          required: false,
          termnum: 4,
          parentTermnum: 3,
          configuratorId: 4,
          deletedAt: null
        }
      ],
      sections: [
        {
          id: 2,
          type: "NONE",
          label: "Test 0",
          description: null,
          termnum: 5,
          parentTermnum: 3,
          configuratorId: 4,
          createdAt: "2025-07-15T09:52:06.084Z",
          updatedAt: null,
          deletedAt: null,
          fields: [],
          sections: []
        },
        {
          id: 3,
          type: "NONE",
          label: "Test 1",
          description: null,
          termnum: 6,
          parentTermnum: 3,
          configuratorId: 4,
          createdAt: "2025-07-15T09:52:18.453Z",
          updatedAt: null,
          deletedAt: null,
          fields: [],
          sections: []
        }
      ]
    }
  ],
  fields: [
    {
      id: 3,
      name: "firstname",
      type: "TEXT",
      label: "firstname",
      info: null,
      required: false,
      termnum: 0,
      parentTermnum: null,
      configuratorId: 4,
      deletedAt: null
    },
    {
      id: 4,
      name: "lastname",
      type: "TEXT",
      label: "lastname",
      info: null,
      required: false,
      termnum: 1,
      parentTermnum: null,
      configuratorId: 4,
      deletedAt: null
    }
  ]
};
