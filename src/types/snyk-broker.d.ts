declare module 'snyk-broker' {
  interface MainOptions {
    config: {
      brokerServerUrl: string;
      brokerToken: string;
      key?: string;
      cert?: string;
      port?: number;
      accept?: string;
    };

    client: boolean;
    port?: number;
  }
  type broker = (options: MainOptions) => any;
  const _exported: { main: broker };
  export = _exported;
}
