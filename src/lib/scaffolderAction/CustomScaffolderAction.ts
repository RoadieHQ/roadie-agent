import { BaseLogger } from 'pino';
import { getLogger } from '@/logger';
import { ScaffolderActionAgentConfiguration } from '$/types';
import { CustomScaffolderActionContext } from '@/scaffolderAction/CustomScaffolderActionContext';
import { AGENT_SCAFFOLDER_FINALIZE_PATH } from './constants';
import fetch from 'node-fetch';
import { downloadFile, generateAndStreamZipfileToS3 } from '@/scaffolderAction/workspaceHandler';

export class CustomScaffolderAction {

  private readonly brokerClientUrl: string;
  private readonly logger: BaseLogger;
  private readonly configuration: ScaffolderActionAgentConfiguration;
  private readonly context: CustomScaffolderActionContext;
  private readonly actionId: string;
  private readonly workspaceUrl?: string;
  private readonly localWorkspacePath: string;

  constructor({ actionId, configuration, brokerClientUrl, payload }: {
    actionId: string
    configuration: ScaffolderActionAgentConfiguration,
    brokerClientUrl: string
    payload: {
      body: Record<string, string>, workspaceUrl?: string
    }
  }) {
    const localWorkspacePath = `/tmp/scaffolder/${actionId}`;
    this.actionId = actionId;
    this.brokerClientUrl = brokerClientUrl;
    this.configuration = configuration;
    this.workspaceUrl = payload.workspaceUrl;
    this.localWorkspacePath = localWorkspacePath;
    this.logger = getLogger('RoadieAgentForwarder');
    this.context = new CustomScaffolderActionContext({
      actionId,
      brokerClientUrl,
      payload: { localWorkspacePath, body: payload.body },
    });
  }

  async start() {

    this.logger.info('Starting a custom scaffolder action in 5 seconds:');
    // TODO: Figure out read-after write consistency
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      // TODO: filesystem handling: Create folder and temp workspace
      console.log(this.workspaceUrl);
      if (this.workspaceUrl && this.workspaceUrl !== 'undefined') {
        await downloadFile(this.workspaceUrl, this.localWorkspacePath);
      }

      await this.configuration.handler(this.context);

      if (this.workspaceUrl && this.workspaceUrl !== 'undefined') {
        const workspaceUrl = (await generateAndStreamZipfileToS3(this.localWorkspacePath, this.actionId))!;
        await this.finalizeAction('success', { workspace: Buffer.from(workspaceUrl).toString('base64') });
      } else {
        await this.finalizeAction('success', {});
      }


    } catch (e) {
      this.logger.error('Failed to run scaffolder action');
      this.logger.error(e);
      await this.finalizeAction('failure');
    }
  }

  async finalizeAction(status: string, payload?: Record<string, string>) {
    {
      this.logger.info(`Finalizing scaffolder action ${this.configuration.name}`);
      const url = `${this.brokerClientUrl}/${AGENT_SCAFFOLDER_FINALIZE_PATH}/${this.actionId}`;
      const body = JSON.stringify({
        status,
        payload,
        actionId: this.actionId,
      });
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      try {
        const responseBody = await response.text();
        this.logger.info(
          `Received response when finalizing scaffolder action. Status: ${response.status}, ${response.statusText}. Body: ${responseBody}`,
        );
      } catch (e) {
        this.logger.warn(
          `No Response or errored response received when finalizing scaffolder action. Status: ${response?.status}, ${response?.statusText}.`,
        );
      }
    }
  }
}