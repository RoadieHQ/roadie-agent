import { ScaffolderActionAgentConfiguration } from '$/types';

export type RoadieAgentScaffolderActionConfiguration = Omit<
  ScaffolderActionAgentConfiguration,
  'type'
>;
export const createRoadieAgentScaffolderAction = ({
  name,
  handler,
}: RoadieAgentScaffolderActionConfiguration): ScaffolderActionAgentConfiguration => {
  return {
    name,
    handler,
    type: 'scaffolder-action',
  };
};
