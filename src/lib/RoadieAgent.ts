import { initializeBrokerConnection } from '@/brokerConnection';
import {
  AvailableAgentConfiguration,
  AvailableAgents,
  EntityProviderAgentConfiguration,
  RoadieAgentConfiguration,
  ScaffolderActionAgentConfiguration,
  TechInsightsDataSourceAgentConfiguration,
  TriggerableAgent,
} from '$/types';
import { RoadieAgentReceiver } from '@/receiver/RoadieAgentReceiver';
import { RoadieAgentForwarder } from '@/forwarder/RoadieAgentForwarder';
import { getLogger } from '@/logger';
import { constructIndividualAgents } from '@/agentConstruction';

const BROKER_CLIENT_URL = 'http://localhost';
export class RoadieAgent {
  private agents: Map<string, TriggerableAgent> = new Map<
    string,
    TriggerableAgent
  >();
  constructor(private readonly config: RoadieAgentConfiguration) {}

  private agentConfigurations: AvailableAgentConfiguration[] = [];
  static fromConfig(config: Partial<RoadieAgentConfiguration>) {
    const defaultConfig = {
      server: 'http://localhost:7341',
      port: 7342,
      identifier: 'example',
      accept: 'config/accept.json',
      agentPort: 7044,
    };
    const logger = getLogger('Roadie Agent');

    const constructedConfig = { ...defaultConfig, ...config };
    logger.info(
      `Running Roadie Agent with configuration ${JSON.stringify(
        constructedConfig,
      )}`,
    );
    return new RoadieAgent(constructedConfig);
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

  async triggerDataSource(agentName: string) {
    return this.trigger('tech-insights-data-source', agentName);
  }

  private async trigger(type: AvailableAgents, agentName: string) {
    if (this.agents.has(agentName)) {
      const triggerableAgent = this.agents.get(agentName)!;
      if (triggerableAgent.type !== type) {
        throw new Error(
          `Found and agent with name ${agentName} but it has a type ${triggerableAgent.type} instead of ${type}`,
        );
      }
      return triggerableAgent!.trigger();
    }
    throw new Error(`No agent found with name ${agentName}`);
  }

  async start() {
    const forwarder = new RoadieAgentForwarder({
      brokerClientUrl: `${BROKER_CLIENT_URL}:${this.config.port}`,
    });

    const { app, agents } = await constructIndividualAgents(
      this.agentConfigurations,
      forwarder,
    );

    const receiver = await RoadieAgentReceiver.fromConfig(
      app,
      this.agentConfigurations,
      forwarder,
      {
        port: this.config.agentPort,
      },
    );
    receiver.start();

    initializeBrokerConnection(this.config);
    agents.forEach((agent) => {
      this.agents.set(agent.name, agent);
    });
    return this;
  }
}
