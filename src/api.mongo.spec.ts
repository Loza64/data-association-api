import { describeApi } from './testing/api-scenarios';

const baseUrl = process.env.API_TEST_URL;

if (baseUrl) {
  describeApi('API (servidor real + MongoDB)', () => baseUrl);
} else {
  describe('API (servidor real + MongoDB)', () => {
    it.skip('requiere API_TEST_URL', () => undefined);
  });
}
