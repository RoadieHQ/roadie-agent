import broker from 'snyk-broker';
import { RoadieAgentConfiguration } from '$/types';

export const initializeBrokerConnection = ({
  server,
  port,
  identifier,
  accept,
}: RoadieAgentConfiguration) => {
  console.log(
    `Initializing broker connection to server ${server} with token ${identifier}. Running local broker client on URL http://localhost:${port}`,
  );
  broker.main({
    client: true,
    config: {
      brokerServerUrl: server,
      brokerToken: `${identifier}-roadie-agent`,
      accept,
      port,
    },
  });
};
