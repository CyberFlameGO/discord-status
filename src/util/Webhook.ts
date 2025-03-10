import axios, {AxiosInstance, AxiosResponse} from 'axios';
import {EmbedBuilder, EmbedJSON} from './EmbedBuilder';

export class Webhook {
  ['constructor']!: typeof Webhook;

  axios: AxiosInstance = axios.create({validateStatus: null});

  token!: string;
  id!: string;

  avatar_url?: string;
  username?: string;

  constructor(
    hook:
      | string
      | {
          id: string;
          token: string;
          avatar_url?: string;
          username?: string;
        }
  ) {
    if (typeof hook === 'string') {
      const parsed = this.constructor.parse(hook);

      if (!parsed) {
        throw new Error('invalid webhook');
      }

      hook = parsed;
    }

    if (!hook.token || !hook.id) {
      throw new Error('invalid webhook.');
    }

    this.id = hook.id;
    this.token = hook.token;
  }

  async get(): Promise<WebhookResponse & {status: number}> {
    const result = await this.axios.get(this.URL);
    return {...result.data, status: result.status};
  }

  async send(body: WebhookBody): Promise<RichWebhookPostResult> {
    const result: AxiosResponse<WebhookPostResult> = await this.axios.post(
      `${this.URL}?wait=1`,
      this.formatBody(body)
    );

    return this.makeRich(result.data);
  }

  async editMsg(
    msg: string,
    body: Pick<WebhookBody, 'content' | 'embeds' | 'allowed_mentions'>
  ): Promise<RichWebhookPostResult> {
    const result = await this.axios.patch(
      `${this.URL}/messages/${msg}`,
      this.formatBody(body)
    );

    return this.makeRich(result.data);
  }

  async deleteMsg(msg: string): Promise<boolean> {
    const result = await this.axios.delete(`${this.URL}/messages/${msg}`);

    return result.status === 204;
  }

  async delete() {
    const result = await this.axios.delete(this.URL);

    return result.status === 204;
  }

  private makeRich(data: WebhookPostResult): RichWebhookPostResult {
    const r: Partial<RichWebhookPostResult> = {};

    r.embeds &&= data.embeds.map(e => new EmbedBuilder(e));
    r.timestamp &&= new Date(data.timestamp);
    r.edited_timestamp &&= new Date(data.edited_timestamp!);

    Object.assign(r, data);

    return r as RichWebhookPostResult;
  }

  private formatBody(body: WebhookBody): WebhookBody {
    const obj = {
      username: this.username,
      avatar_url: this.avatar_url,
      ...body,
    };

    obj.embeds &&= obj.embeds?.map(e =>
      e instanceof EmbedBuilder ? e.toJSON() : e
    );

    return obj;
  }

  get URL(): string {
    return `https://discord.com/api/webhooks/${this.id}/${this.token}`;
  }

  async isValid(): Promise<boolean> {
    const res: AxiosResponse<WebhookResponse> = await this.axios.get(this.URL);

    return res.status === 200 && res.data.id === this.id;
  }

  static parse(
    hook: string
  ): {
    id: NonNullable<WebhookResponse['id']>;
    token: NonNullable<WebhookResponse['token']>;
  } | null {
    const re = /^(?:https?:\/\/)?(?:canary.|ptb.)?discord(?:app)?.com\/api\/webhooks\/(?<id>\d{16,19})\/(?<token>[-_A-Za-z0-9.]+)(\?.*)?$/;
    const groups = re.exec(hook)?.groups;

    if (!(groups?.token && groups?.id)) {
      // throw new TypeError('Invalid webhook');
      return null;
    }

    return {
      id: groups.id,
      token: groups.token,
    };
  }

  toJSON(): {
    id: string;
    token: string;
    username?: string;
    avatar_url?: string;
  } {
    return {
      id: this.id,
      token: this.token,
      username: this?.username,
      avatar_url: this?.avatar_url,
    };
  }
}

export interface WebhookResponse {
  id: string;
  type: 1 | 2;
  guild_id?: string;
  channel_id: string;
  user?: object;
  name: string | null;
  avatar: string | null;
  token?: string;
  application_id: string | null;
}

export interface WebhookBody {
  username?: string;
  content?: string;
  avatar_url?: string;
  tts?: boolean;
  file?: Buffer;
  embeds?: (EmbedBuilder | EmbedJSON)[];
  allowed_mentions?: AllowedMentions;
}

export interface AllowedMentions {
  parse?: ('roles' | 'users' | 'everyone')[];
  roles?: string[];
  users?: string[];
  replied_user?: boolean;
}

export interface WebhookPostResult {
  id: string;
  type: number;
  content: string;
  author: {
    bot: boolean;
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  attachments: {
    id: string;
    filename: string;
    size: number;
    url: string;
    proxy_url: string;
    height: number | null;
    width: number | null;
  }[];
  embeds: EmbedJSON[];
  mentions: string[];
  mention_roles: string[];
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  timestamp: string;
  edited_timestamp: string | null;
  flags: number;
  webhook_id: string;
}

export interface RichWebhookPostResult
  extends Omit<WebhookPostResult, 'embeds' | 'timestamp' | 'edited_timestamp'> {
  embeds: EmbedBuilder[];
  timestamp: Date;
  edited_timestamp: Date | null;
}
