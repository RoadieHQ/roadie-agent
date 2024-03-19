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
  private readonly config: RoadieAgentConfiguration;

  constructor(config: Partial<RoadieAgentConfiguration> = {}) {
    this.config = {
      server: config.server ?? 'http://localhost:7341',
      port: config.port ?? 7342,
      identifier: config.identifier ?? 'example',
      accept: config.accept ?? 'config/accept.json',
      agentPort: config.agentPort ?? 7044,
    };
  }
  private agentConfigurations: AvailableAgentConfiguration[] = [];

  static fromConfig(config: Partial<RoadieAgentConfiguration> = {}) {
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
