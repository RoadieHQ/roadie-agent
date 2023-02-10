import { Express } from 'express';
import { AvailableAgentConfiguration, HandlerConfig } from '$/types';
import { getLogger } from '@/logger';
import { BaseLogger } from 'pino';
import { RoadieAgentForwarder } from '@/forwarder/RoadieAgentForwarder';
import { constructRequestListeners } from '@/receiver/requestListeners';

export class RoadieAgentReceiver {
  private server: Express;
  private agentConfigurations: Map<string, AvailableAgentConfiguration>;
  private handlerConfig: HandlerConfig;
  private logger: BaseLogger;

  static async fromConfig(
    agentConfigurations: AvailableAgentConfiguration[],
    forwarder: RoadieAgentForwarder,
    handlerConfig: HandlerConfig,
  ) {
    const server = await constructRequestListeners(
      agentConfigurations,
      forwarder,
    );
    return new RoadieAgentReceiver(
      server,
      agentConfigurations,
      forwarder,
      handlerConfig,
    );
  }

  constructor(
    server: Express,
    agentConfigurations: AvailableAgentConfiguration[],
    forwarder: RoadieAgentForwarder,
    handlerConfig: HandlerConfig,
  ) {
    this.server = server;
    this.handlerConfig = handlerConfig;
    this.logger = getLogger('RoadieAgentForwarder');
    this.agentConfigurations = agentConfigurations.reduce(
      (acc, agentConfiguration) => {
        acc.set(agentConfiguration.name, agentConfiguration);
        return acc;
      },
      new Map<string, AvailableAgentConfiguration>(),
    );
  }

  start() {
    this.logger.info('Starting Roadie Agent Receiver webserver');
    this.server.listen(this.handlerConfig.port);
  }
}
