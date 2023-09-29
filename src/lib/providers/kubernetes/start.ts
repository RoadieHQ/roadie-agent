#!/usr/bin/env ts-node
import {createRoadieAgentEntityProvider, RoadieAgent} from "../../";
import {KubernetesEntityProvider} from "@/providers/kubernetes/EntityProvider";
import {getRootLogger} from "@/logger";
import yaml from 'yaml';

const podTemplate = `
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: {{ metadata.name }}
  namespace: {{ metadata.namespace }}
spec:
  type: service
  lifecycle: unknown
  owner: test
`;

const helmChartTemplate = `
---
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: {{ metadata.name }}
  namespace: {{ metadata.namespace }}
spec:
  type: 'helm-chart'
  lifecycle: unknown
  owner: test
`;

const main = async () => {
    const logger = getRootLogger();
    const brokerServer = process.env.BROKER_SERVER || 'http://localhost:7341';

    RoadieAgent.fromConfig({
        server: brokerServer,
        port: 7342,
        identifier: 'kubernetes-entity-agent',
        accept: '/Users/brianfletcher/git-repos/roadie-agent/config/accept.json',
        agentPort: 7044
    })
        .addEntityProvider(
            createRoadieAgentEntityProvider({
                name: 'kube',
                handler: new KubernetesEntityProvider({
                    namespaceFilters: {

                    },
                    objectMappings: [{
                        template: podTemplate,
                        plural: 'pods',
                    },
                    {
                        template: helmChartTemplate,
                        version: 'v1beta1',
                        group: 'source.toolkit.fluxcd.io',
                        plural: 'helmcharts',
                    }]}).handler
            }),
        )
        .start();
}

void (async () => {
    try {
        await main()
    } catch(err) {
        console.error('Something bad')
    }
})()


