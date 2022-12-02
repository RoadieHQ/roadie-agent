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

  function broker(options: MainOptions): any;
  const _exported: { main: typeof broker };
  export = _exported;
}
