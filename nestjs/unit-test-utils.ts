/* eslint-disable @typescript-eslint/no-explicit-any */
import { InjectionToken } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'sequelize-typescript';

export const mockTransactionCallback = (tx: any) => (callback: any) => callback(tx);

const dbMethods = ['create', 'bulkCreate', 'upsert', 'findAll', 'findOne', 'update', 'destroy'] as const;

type DbMethods = (typeof dbMethods)[number];

export function getMockDbModelProviders(
  ...tokens: Array<typeof Model | [typeof Model, Partial<Record<DbMethods, jest.SpyInstance>>]>
) {
  return tokens.map((tokenInfo) => {
    let methodMap = dbMethods.reduce((obj, method) => {
      obj[method] = jest.fn();
      return obj;
    }, {} as Record<string, jest.SpyInstance>);

    let token: typeof Model;
    if (Array.isArray(tokenInfo)) {
      token = tokenInfo[0];
      methodMap = { ...methodMap, ...tokenInfo[1] };
    } else {
      token = tokenInfo;
    }

    return {
      provide: getModelToken(token),
      useValue: {
        sequelize: {
          query: jest.fn(),
        },
        ...methodMap,
      },
    };
  });
}

export function getMockProviders(...tokens: InjectionToken[]) {
  const mockProviders = tokens.map((token) => {
    const mockObj = Object.getOwnPropertyNames((token as any).prototype)
      .filter((method) => !['constructor'].includes(method))
      .reduce<Record<string, jest.SpyInstance>>((obj, key) => {
        obj[key] = jest.fn();
        return obj;
      }, {});
    return {
      provide: token,
      useValue: mockObj,
    };
  });
  return mockProviders;
}

export async function getTestingModule(
  mainService: Provider,
  opts: {
    providers?: Array<
      | Provider
      | typeof Model
      | [typeof Model, Partial<Record<DbMethods, jest.SpyInstance>>]
      | [Provider, Record<string, jest.SpyInstance>]
    >;
  },
) {
  const providers = (opts || {}).providers || [];
  const providerList: any[] = providers.map((provider) => {
    if ((provider as any).prototype instanceof Model) {
      return getMockDbModelProviders(provider as any as typeof Model);
    } else {
      return getMockProviders(provider as InjectionToken);
    }
  });
  const module: TestingModule = await Test.createTestingModule({
    providers: [mainService, ...providerList.flat()],
  }).compile();

  return module;
}
