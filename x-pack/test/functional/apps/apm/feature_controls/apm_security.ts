/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SecurityService } from '../../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security: SecurityService = getService('security');
  const PageObjects = getPageObjects(['common', 'error', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('security', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await PageObjects.security.forceLogout();
    });

    describe('global apm all privileges', () => {
      before(async () => {
        await security.role.create('global_apm_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                apm: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_apm_all_user', {
          password: 'global_apm_all_user-password',
          roles: ['global_apm_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_apm_all_user', 'global_apm_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_apm_all_role');
        await security.user.delete('global_apm_all_user');
      });

      it('shows apm navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link: Record<string, string>) => link.text)).to.eql([
          'APM',
          'Management',
        ]);
      });

      it('can navigate to APM app', async () => {
        await PageObjects.common.navigateToApp('apm');
        await testSubjects.existOrFail('apmMainContainer', 10000);
      });
    });

    describe('global apm read-only privileges', () => {
      before(async () => {
        await security.role.create('global_apm_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                apm: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_apm_read_user', {
          password: 'global_apm_read_user-password',
          roles: ['global_apm_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_apm_read_user', 'global_apm_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_apm_read_role');
        await security.user.delete('global_apm_read_user');
      });

      it('shows apm navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['APM', 'Management']);
      });

      it('can navigate to APM app', async () => {
        await PageObjects.common.navigateToApp('apm');
        await testSubjects.existOrFail('apmMainContainer', 10000);
      });
    });

    describe('no apm privileges', () => {
      before(async () => {
        await security.role.create('no_apm_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_apm_privileges_user', {
          password: 'no_apm_privileges_user-password',
          roles: ['no_apm_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_apm_privileges_user',
          'no_apm_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_apm_privileges_role');
        await security.user.delete('no_apm_privileges_user');
      });

      it(`doesn't show APM navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('APM');
      });

      it(`renders not found page`, async () => {
        await PageObjects.common.navigateToUrl('apm', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.error.expectNotFound();
      });
    });
  });
}
