const routesMethods = [
  { route: "/api/cloneVersion", methods: ["OPTIONS", "POST"] },
  { route: "/api/calculation", methods: ["POST"] },
  { route: "/api/createNewIntervention", methods: ["OPTIONS", "POST"] },
  { route: "/api/projects/createIntervention", methods: [] } // No explicit methods defined
];

export default routesMethods;
