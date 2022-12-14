import { EntityProviderAgentConfiguration } from '$/types';

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
