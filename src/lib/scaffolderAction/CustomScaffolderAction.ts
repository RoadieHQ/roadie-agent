import { BaseLogger } from 'pino';
import { getLogger } from '@/logger';
import { ScaffolderActionAgentConfiguration } from '$/types';
import { CustomScaffolderActionContext } from '@/scaffolderAction/CustomScaffolderActionContext';
import { AGENT_SCAFFOLDER_FINALIZE_PATH } from './constants';
import fetch from 'node-fetch';
import {
  downloadFile,
  generateAndStreamZipfileToS3,
} from '@/scaffolderAction/workspaceHandler';
import {
  addRunningAction,
  removeRunningAction,
} from '@/scaffolderAction/runtimeContext';

export class CustomScaffolderAction {
  private readonly brokerClientUrl: string;
  private readonly logger: BaseLogger;
  private readonly configuration: ScaffolderActionAgentConfiguration;
  private readonly context: CustomScaffolderActionContext;
  private readonly actionId: string;
  private readonly getPresign?: string;
  private readonly putPresign?: string;
  private readonly localWorkspacePath: string;

  constructor({
    actionId,
    configuration,
    brokerClientUrl,
    payload,
  }: {
    actionId: string;
    configuration: ScaffolderActionAgentConfiguration;
    brokerClientUrl: string;
    payload: {
      body: Record<string, string>;
      putPresign?: string;
      getPresign?: string;
    };
  }) {
    const localWorkspacePath = `/tmp/scaffolder/${actionId}`;
    this.actionId = actionId;
    this.brokerClientUrl = brokerClientUrl;
    this.configuration = configuration;
    this.getPresign = payload.getPresign;
    this.putPresign = payload.putPresign;
    this.localWorkspacePath = localWorkspacePath;
    this.logger = getLogger('RoadieAgentForwarder');
    this.context = new CustomScaffolderActionContext({
      actionId,
      brokerClientUrl,
      payload: { localWorkspacePath, body: payload.body },
    });
  }

  async start() {
    this.logger.info('Starting a custom scaffolder action');
    try {
      addRunningAction(this.actionId);
      if (this.getPresign && this.getPresign !== '') {
        await downloadFile(this.getPresign, this.localWorkspacePath);
      }

      await this.configuration.handler(this.context);

      if (this.putPresign && this.putPresign !== '') {
        const etag = await generateAndStreamZipfileToS3(
          this.putPresign,
          this.localWorkspacePath,
        );
        await this.finalizeAction('success', { workspace: true, etag });
      } else {
        await this.finalizeAction('success', {});
      }
    } catch (e: any) {
      this.logger.error('Failed to run scaffolder action');
      this.logger.error(e);
      await this.finalizeAction('failure', { message: e.message });
    }
  }

  async finalizeAction(status: string, payload?: Record<string, any>) {
    {
      this.logger.info(
        `Finalizing scaffolder action ${this.configuration.name}`,
      );
      const url = `${this.brokerClientUrl}/${AGENT_SCAFFOLDER_FINALIZE_PATH}/${this.actionId}`;
      const body = JSON.stringify({
        status,
        payload,
        actionId: this.actionId,
      });

      removeRunningAction(this.actionId);

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
        this.logger.debug(e);
        this.logger.warn(
          `No Response or errored response received when finalizing scaffolder action. Status: ${response?.status}, ${response?.statusText}.`,
        );
      }
    }
  }
}
