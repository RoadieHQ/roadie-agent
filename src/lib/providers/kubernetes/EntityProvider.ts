import {EntityProviderHandler} from "$/types";
import {ComponentEntity, Entity, SystemEntity} from "@backstage/catalog-model";
import {isError} from "@backstage/errors";
import {getRootLogger} from "@/logger";
import {KubeConfig, CoreV1Api, V1Namespace, V1ServiceList, CustomObjectsApi} from '@kubernetes/client-node';
import {renderString} from 'nunjucks';
import yaml from 'yaml'

const ROADIE_OWNER_ANNOTATION = 'roadie.io/owner'
const ROADIE_LIFECYCLE_ANNOTATION = 'roadie.io/lifecycle'

type KubernetesEntityProviderOptions = {
    namespaceFilters?: {
        labelSelector?: string
        fieldSelector?: string
    },
    objectMappings: Array<{
        group?: string,
        version?: string,
        plural: string,
        labelSelector?: string,
        fieldSelector?: string,
        template: string
    }>
}

export class KubernetesEntityProvider {
    private readonly opts: KubernetesEntityProviderOptions;
    private readonly kc: KubeConfig;

    constructor(opts: KubernetesEntityProviderOptions) {
        this.opts = opts
        this.kc = new KubeConfig();
        this.kc.loadFromDefault()
    }

    private async listNamespaces() {
        const k8sApi = this.kc.makeApiClient(CoreV1Api);
        const {body: namespaces} = await k8sApi.listNamespace(undefined, undefined, undefined, this.opts.namespaceFilters?.fieldSelector, this.opts.namespaceFilters?.labelSelector);
        return namespaces
    }

    private async listPods(namespace: string, labelSelector?: string, fieldSelector?: string) {
        const k8sApi = this.kc.makeApiClient(CoreV1Api);
        const {body: pods} = await k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, fieldSelector, labelSelector);
        return pods
    }

    handler: EntityProviderHandler = async (emit) => {
        const logger = getRootLogger();
        logger.info(`handling entity request`)
        try {
            const entities: Entity[] = []

            const k8sCustomObjectsApi = this.kc.makeApiClient(CustomObjectsApi)
            const namespaces = await this.listNamespaces();

            await Promise.all(namespaces.items.map(async namespace => {
                await Promise.all(this.opts.objectMappings.map(async objectMapping => {
                    if (namespace.metadata?.name) {
                        if (objectMapping.plural === 'pods') {
                            const list = await this.listPods(namespace.metadata?.name, objectMapping.labelSelector, objectMapping.fieldSelector);
                            list.items.forEach(pod => {
                                const entityString = renderString(objectMapping.template, pod);
                                const items = yaml.parseAllDocuments(entityString).map(doc => doc.toJSON())
                                entities.push(...items)
                            })
                        }

                        if (objectMapping.group && objectMapping.version) {
                            const { response } = await k8sCustomObjectsApi.listNamespacedCustomObject(
                                objectMapping.group,
                                objectMapping.version,
                                namespace.metadata.name,
                                objectMapping.plural
                            );
                            (response as any).body.items.forEach((customResource: any) => {
                                const entityString = renderString(objectMapping.template, customResource);
                                const items = yaml.parseAllDocuments(entityString).map(doc => doc.toJSON())
                                entities.push(...items)
                            })
                        }
                    }
                }))
            }));

            await emit({
                type: "full",
                entities: entities.map(entity => ({
                    entity,
                    locationKey: 'test'
                }))
            })
        } catch (e: any) {
            logger.info(`handling entity request failed: ${e}`);
        }
    }
}
