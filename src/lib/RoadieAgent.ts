import { initializeBrokerConnection } from '@/brokerConnection';
import {
  AvailableAgentConfiguration,
  EntityProviderAgentConfiguration,
  RoadieAgentConfiguration,
  ScaffolderActionAgentConfiguration,
  TechInsightsDataSourceAgentConfiguration,
} from '$/types';
import { RoadieAgentReceiver } from '@/RoadieAgentReceiver';

const BROKER_CLIENT_URL = 'http://localhost';

export class RoadieAgent {
  constructor(private readonly config: RoadieAgentConfiguration) {
  }

  private agentConfigurations: AvailableAgentConfiguration[] = [];

  static fromConfig(
    config: RoadieAgentConfiguration = {
      server: 'http://localhost:7341',
      port: 7342,
      identifier: 'example',
      accept: 'config/accept.json',
      agentPort: 7044,
    },
  ) {
    return new RoadieAgent(config);
  }

  addEntityProvider(
    entityProviderAgentConfiguration: EntityProviderAgentConfiguration,
  ) {
    this.agentConfigurations.push(entityProviderAgentConfiguration);
    return this;
  }

  addScaffolderAction(
    scaffolderActionAgentConfiguration: ScaffolderActionAgentConfiguration,
  ) {
    this.agentConfigurations.push(scaffolderActionAgentConfiguration);
    return this;
  }

  addTechInsightsDataSource(
    techInsightsDataSourceConfiguration: TechInsightsDataSourceAgentConfiguration,
  ) {
    this.agentConfigurations.push(techInsightsDataSourceConfiguration);
    return this;
  }

  start() {
    const receiver = new RoadieAgentReceiver(
      this.agentConfigurations,
      `${BROKER_CLIENT_URL}:${this.config.port}`,
      {
        port: this.config.agentPort,
      },
    );
    receiver.start();
    initializeBrokerConnection(this.config);
  }
}
