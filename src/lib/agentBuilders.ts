import {
  EntityProviderAgentConfiguration,
  TechInsightsDataSourceAgentConfiguration,
} from '$/types';

export type RoadieAgentEntityProviderConfiguration = Omit<
  EntityProviderAgentConfiguration,
  'type'
>;
export const createRoadieAgentEntityProvider = ({
  name,
  handler,
}: RoadieAgentEntityProviderConfiguration): EntityProviderAgentConfiguration => {
  return {
    name,
    handler,
    type: 'entity-provider',
  };
};

export type RoadieAgentTechInsightsConfiguration = Omit<
  TechInsightsDataSourceAgentConfiguration,
  'type'
>;
export const createRoadieAgentTechInsightsDataSource = ({
  name,
  schema,
  handler,
}: RoadieAgentTechInsightsConfiguration): TechInsightsDataSourceAgentConfiguration => {
  return {
    name,
    schema,
    handler,
    type: 'tech-insights-data-source',
  };
};
