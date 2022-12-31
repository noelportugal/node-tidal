import axios from 'axios';
const LocalStorage = require('node-localstorage').LocalStorage
const localStorage = new LocalStorage('./scratch')

import { Albums, Artists, Playlists, Tracks } from './api/index.js';

import { ClientOptions, Country, RequestOptions, searchType } from './types/index.js';

export class Tidal {
  public countryCode: Country;
  public clientId: string;
  public clienSecret: string;
  public accessToken: string;
  public refreshToken: string;

  public albums: Albums;
  public artists: Artists;
  public playlists: Playlists;
  public tracks: Tracks;

  constructor(options?: ClientOptions) {
    this.countryCode = options?.countryCode || 'US';
    this.clientId = options?.clientId || '4ywnjRfroi84hz7i';
    this.clienSecret = options?.clientSecret || encodeURIComponent('7cNdrLt3NIQg0CHEpMDjcbV38XlwVdstczHqf59QiI0=');
    this.accessToken = options?.accessToken || '';
    this.refreshToken = options?.refreshToken || '';

    this.albums = new Albums(this);
    this.artists = new Artists(this);
    this.playlists = new Playlists(this);
    this.tracks = new Tracks(this);
  }

  /**
  * get tokens
  */
  async getTokens() {
    this.accessToken = localStorage.getItem('access_token')
    this.refreshToken = localStorage.getItem('refresh_token')
  }

  /**
  * set tokens
  */
  async setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  /**
   * It searches for a specific type of content on Tidal.
   * @param {string} query - The query to search for.
   * @param {searchType} type - The type of content to search for.
   * @param {number} [limit=50] - The amount of results to return.
   * @param {number} [offset=0] - The offset of the results.
   * @returns The results of the search.
   * @example
   * const results = await tidal.search('The Weeknd', 'tracks');
   * console.log(results);
   * // => { totalNumberOfItems: 100, limit: 50, offset: 0, items: [...] }
   **/
  public async search(
    query: string,
    type: searchType,
    limit: number = 3,
    offset: number = 0,
    includeContributors: boolean = true,
  ) {
    const { items } = await this._request(`search/${type}`, {
      params: {
        query,
        limit,
        offset,
        type,
        includeContributors,
      },
    });
    return items;
  }

    /**
   * It searches for top hits on Tidal.
   * @param {string} query - The query to search for.
   * @param {searchType} types - The type of content to search for.
   * @param {number} [limit=50] - The amount of results to return.
   * @param {number} [offset=0] - The offset of the results.
   * @returns The results of the search.
   * @example
   * const results = await tidal.search('The Weeknd', 'tracks');
   * console.log(results);
   * // => { totalNumberOfItems: 100, limit: 50, offset: 0, items: [...] }
   **/
  public async searchTopHits(
    query: string,
    types: searchType,
    limit: number = 3,
    offset: number = 0,
    includeContributors: boolean = true,
  ) {
    const items = await this._request(`search/top-hits`, {
      params: {
        query,
        limit,
        offset,
        types,
        includeContributors,
      },
    });
    return items;
  }

  private async startAuthorization() {
    try{
      const { data } = await axios({
        url: 'https://auth.tidal.com/v1/oauth2/device_authorization',
        method: 'POST',
        params: {'client_id': this.clientId, 'scope': 'r_usr+w_usr+w_sub'},
      })
      console.log(`Got to https://${data.verificationUriComplete}`);
      await this.startAuthorizationPolling(data.deviceCode);
    }catch(error: any){
      console.log(error);
    }
  }

  private async startAuthorizationPolling(deviceCode: string) {
     let count = 0;
     console.log('Waiting for authorization');
     const intervalObj = setInterval(async () => {
      const data = await this.authorizationPoll(deviceCode);
      count++;
      if (data || count === 60) {
        await this.setTokens(data.access_token, data.refresh_token)
        clearInterval(intervalObj);
        console.log('Your client has been authorized! Please make a new request.');
      }
      }, 4000);
  }

  private async authorizationPoll(deviceCode: string) {
    try{
      const { data } = await axios({
        url: `https://auth.tidal.com/v1/oauth2/token?client_secret=${this.clienSecret}`,
        method: 'POST',
        params: {
          'client_id': this.clientId,
          'device_code': deviceCode.toLowerCase(),
          'grant_type': 'urn:ietf:params:oauth:grant-type:device_code',
          'scope': 'r_usr+w_usr+w_sub'
        },
      })
      return data;
    }catch(error: any){
      console.log(error.response.data.error);
    }
  }

  public async getRefreshToken() {
    try{
      await this.getTokens();
      const { data } = await axios({
        url: `https://auth.tidal.com/v1/oauth2/token?client_secret=${this.clienSecret}`,
        method: 'POST',
        params: {
          'client_id': this.clientId,
          'refresh_token': this.refreshToken,
          'grant_type': 'refresh_token',
          'scope': 'r_usr+w_usr+w_sub'
        },
      })
      await this.setTokens(data.access_token, data.refresh_token)
    }catch(error: any){
      console.log(error.response.data);
    }
  }

  /**
   * It makes a request to the Tidal API, and if it fails, it will retry the request after a certain
   * amount of time.
   * @param {string} url - The url of the request.
   * @param {RequestOptions} [options] - The options of the request.
   * @returns The data from the request.
   */
  public async _request(url: string, options?: RequestOptions): Promise<any> {
    await this.getTokens();
    if (this.accessToken === "" || !this.accessToken) {
      console.log('Starting authorization');
      await this.startAuthorization();
    } else {
      try {
          const { data } = await axios({
            url: `https://api.tidal.com/${options?.versions || 'v1'}/${url}`,
            method: options?.method || 'GET',
            params: { ...options?.params, countryCode: this.countryCode, deviceType: 'BROWSER' },
            headers: {
              Origin: 'http://listen.tidal.com',
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
              ...options?.headers,
            },
            data: options?.body,
          });
          return data;
      } catch (error: any) {
        if (!error.response) throw error;
        else if (error.response.status == 404) throw error.response.data;
        else if (error.response.status == 429) {
          const retryAfter = error.response.headers['Retry-After'];
          if (typeof retryAfter == 'number') await new Promise((r) => setTimeout(r, retryAfter * 1000));
          return this._request(url, options);
          // @ts-ignore
        } else if (error.response.status == 401 && this.accessToken && this.refreshToken) {
          await this.getRefreshToken();
          return this._request(url, options);
        }
        else throw error.response.data;
      }
    }

  }
}
