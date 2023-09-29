import { EntityProviderMutation } from '@backstage/plugin-catalog-node';

export type AvailableAgents =
  | 'entity-provider'
  | 'tech-insights-data-source'
  | 'scaffolder-action';

export interface AgentConfiguration<
  AgentConfigurationType extends AvailableAgents,
> {
  type: AgentConfigurationType;
  name: string;
}

export type EntityProviderHandler = (emit: (mutation: EntityProviderMutation) => Promise<void>) => void;

export interface EntityProviderAgentConfiguration
  extends AgentConfiguration<'entity-provider'> {
  handler: EntityProviderHandler;
}
export type TechInsightsDataSourceAgentConfiguration =
  AgentConfiguration<'tech-insights-data-source'>;
export type ScaffolderActionAgentConfiguration =
  AgentConfiguration<'scaffolder-action'>;

export type AvailableAgentConfiguration =
  | EntityProviderAgentConfiguration
  | TechInsightsDataSourceAgentConfiguration
  | ScaffolderActionAgentConfiguration;

export type RoadieAgentConfiguration = {
  /**
   * URL to Roadie server. Usually has a form like https://<tenant-name>.broker.roadie.so.
   */
  server: string;

  /**
   * Port to use for the local broker client receiver web server. Defaults to 7342
   */
  port: number;

  /**
   * Port to use for the local Roadie Agent that handles events
   */
  agentPort: number;

  /**
   * Identifier of the broker connection. Also known as broker token
   */
  identifier: string;

  /**
   * Path to the broker client accept file to use. Defaults to config/accept.json
   */
  accept: string;
};

export type HandlerConfig = {
  /**
   * Port to use for the local Roadie Agent that handles events. Defaults to 7044
   */
  port: number;
};
