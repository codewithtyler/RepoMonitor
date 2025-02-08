declare module '../../config.json' {
  interface Plan {
    name: string;
    price: number;
    analysesPerMonth: number;
    features: string[];
  }

  interface Config {
    plans: {
      free: Plan;
      pro: Plan;
    };
  }

  const config: Config;
  export default config;
}
