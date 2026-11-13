/**
 * End-to-end test of the AquaTap API (developer sign-in must be enabled).
 *
 * Run it against the TEST database, never against aquatap_db:
 *   npm run db:test:reset
 *   DB_NAME=aquatap_test_db PORT=3100 AUTH_RATE_LIMIT_PER_MINUTE=40 node dist/main.js   (separate terminal)
 *   API_URL=http://localhost:3100/api/v1 npm run test:api
 * Restart that API before running the test again (the sign-in rate limit is checked at the end).
 */
import { createHmac } from 'node:crypto';
import sharp from 'sharp';

// Default = the test API on port 3100 (the developer's own API and data are on port 3000).
const BASE_URL = process.env.API_URL ?? 'http://localhost:3100/api/v1';
const runId = Date.now().toString(36);
const results = [];

async function call(method, path, { token, body, expectStatus } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  const expected = expectStatus ?? (response.status < 300 ? response.status : 200);
  const passed = response.status === expected;
  results.push({ step: `${method} ${path}`, status: response.status, passed });
  if (!passed) {
    console.log(`✖ ${method} ${path} -> ${response.status} (expected ${expected})`, JSON.stringify(data));
  } else {
    console.log(`✔ ${method} ${path} -> ${response.status}`);
  }
  return data;
}

function check(label, condition, details) {
  results.push({ step: label, passed: Boolean(condition) });
  console.log(`${condition ? '✔' : '✖'} ${label}${condition ? '' : ' ' + JSON.stringify(details)}`);
}

async function waitForApi() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('API did not start');
}

const signature = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120"><path d="M10 60 C 40 10, 65 10, 95 60 S 150 110, 180 60" stroke="#0F172A" stroke-width="3" fill="none"/></svg>';
const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

await waitForApi();
await call('GET', '/health');
const config = await call('GET', '/auth/config');
check('dev sign-in enabled', config.isDevSignInEnabled === true, config);

// --- Owner registers a station ---
const ownerSession = await call('POST', '/auth/dev-sign-in', { body: { email: `owner.${runId}@aquatap.test` } });
check('new owner needs onboarding', ownerSession.profile.needsOnboarding === true, ownerSession.profile);
const ownerToken = ownerSession.accessToken;
const station = await call('POST', '/water-stations', {
  token: ownerToken,
  body: {
    ownerFullName: 'leo  isidro dumangas',
    stationName: `AquaTap Test ${runId}`,
    address: 'Lapu-Lapu St., Cebu City',
    contactNumber: '09171234567',
    pricePerGallon: 25,
    latitude: 10.3157,
    longitude: 123.8854,
  },
  expectStatus: 201,
});
const ownerProfile = await call('GET', '/auth/me', { token: ownerToken });
check('owner became Admin', ownerProfile.role === 'Admin' && ownerProfile.isOwner, ownerProfile);
check('name normalized uppercase', ownerProfile.fullName === 'LEO ISIDRO DUMANGAS', ownerProfile.fullName);

// --- KYB: unverified station is hidden; owner uploads documents; reviewer approves ---
const stationsBeforeKyb = await call('GET', '/water-stations', { token: ownerToken });
check('unverified station hidden from customers', !stationsBeforeKyb.some((s) => s.waterStationId === station.waterStationId), stationsBeforeKyb.length);
const kybStart = await call('GET', '/water-stations/mine/verification', { token: ownerToken });
check('KYB starts NotSubmitted with 6 missing docs', kybStart.verificationStatus === 'NotSubmitted' && kybStart.missingDocumentTypes.length === 6, kybStart);
await call('POST', '/water-stations/mine/verification/submit', { token: ownerToken, expectStatus: 400 });
await call('PUT', '/water-stations/mine/verification/business-info', { token: ownerToken, body: { registeredBusinessName: 'Dumangas Water Refilling', taxIdentificationNumber: '12345' }, expectStatus: 400 });
await call('PUT', '/water-stations/mine/verification/business-info', { token: ownerToken, body: { registeredBusinessName: 'Dumangas Water Refilling', taxIdentificationNumber: '123-456-789-000' } });
await call('POST', '/water-stations/mine/verification/documents', { token: ownerToken, body: { documentType: 'SanitaryPermit', fileName: 'virus.exe', fileData: 'data:application/x-msdownload;base64,AAAA' }, expectStatus: 400 });
let lastDocument;
for (const documentType of kybStart.requiredDocumentTypes) {
  lastDocument = await call('POST', '/water-stations/mine/verification/documents', { token: ownerToken, body: { documentType, fileName: `${documentType}.png`, fileData: tinyPng }, expectStatus: 201 });
}
const replaced = await call('POST', '/water-stations/mine/verification/documents', { token: ownerToken, body: { documentType: lastDocument.documentType, fileName: 'retake.png', fileData: tinyPng }, expectStatus: 201 });
check('re-upload replaces the same document', replaced.stationDocumentId === lastDocument.stationDocumentId, replaced);
const documentFile = await call('GET', `/water-stations/mine/verification/documents/${replaced.stationDocumentId}`, { token: ownerToken });
check('document file returned', documentFile.fileData.startsWith('data:image/png'), documentFile.fileName);
const submitted = await call('POST', '/water-stations/mine/verification/submit', { token: ownerToken });
check('submitted -> UnderReview', submitted.verificationStatus === 'UnderReview' && submitted.missingDocumentTypes.length === 0, submitted.verificationStatus);
await call('POST', '/water-stations/mine/verification/documents', { token: ownerToken, body: { documentType: 'Other', fileName: 'x.png', fileData: tinyPng }, expectStatus: 400 });
const reviewerSession = await call('POST', '/auth/dev-sign-in', { body: { email: 'admin@aquatap.test' } });
check('reviewer email becomes SystemAdmin', reviewerSession.profile.role === 'SystemAdmin', reviewerSession.profile.role);
const reviewerToken = reviewerSession.accessToken;
await call('GET', '/station-reviews', { token: ownerToken, expectStatus: 403 });
const underReview = await call('GET', '/station-reviews?verificationStatus=UnderReview', { token: reviewerToken });
check('reviewer sees the submitted station', underReview.some((s) => s.waterStationId === station.waterStationId), underReview.length);
await call('GET', `/station-reviews/${station.waterStationId}/documents/${replaced.stationDocumentId}`, { token: reviewerToken });
const rejected = await call('POST', `/station-reviews/${station.waterStationId}/reject`, { token: reviewerToken, body: { remarks: 'Sanitary permit photo is blurry' } });
check('rejected with remarks', rejected.verificationStatus === 'Rejected' && rejected.isEditable, rejected.verificationRemarks);
await call('POST', '/water-stations/mine/verification/submit', { token: ownerToken });
const approved = await call('POST', `/station-reviews/${station.waterStationId}/approve`, { token: reviewerToken });
check('approved -> Verified', approved.verificationStatus === 'Verified' && approved.verifiedAt !== null, approved.verificationStatus);

// --- Admin invites rider ---
const riderEmail = `rider.${runId}@aquatap.test`;
await call('POST', '/employees', {
  token: ownerToken,
  body: { fullName: 'Juan Rider', email: riderEmail, contactNumber: '09181112222' },
  expectStatus: 201,
});
const riderSession = await call('POST', '/auth/dev-sign-in', { body: { email: riderEmail } });
check('invited rider became Employee', riderSession.profile.role === 'Employee', riderSession.profile);
const riderToken = riderSession.accessToken;

// --- Customer signs the e-contract ---
const customerSession = await call('POST', '/auth/dev-sign-in', { body: { email: `maria.${runId}@aquatap.test` } });
const customerToken = customerSession.accessToken;
const stations = await call('GET', '/water-stations', { token: customerToken });
check('station list has new station', stations.some((s) => s.waterStationId === station.waterStationId), stations);
const template = await call('GET', `/water-stations/${station.waterStationId}/contract-template`, { token: customerToken });
check('contract template has placeholders', template.contractTemplate.includes('{{FullName}}'), template);
const account = await call('POST', '/customers/register', {
  token: customerToken,
  body: {
    waterStationId: station.waterStationId,
    fullName: 'Maria Clara Santos',
    address: 'Purok 3, Brgy. Lahug, Cebu City',
    occupation: 'Teacher',
    contactNumber: '09223334444',
    landmark: 'Near the chapel',
    latitude: 10.3312,
    longitude: 123.8995,
    borrowedGallons: 3,
    signatureSvg: signature,
    useContractTemplate: true,
  },
  expectStatus: 201,
});
check('first remaining gallons = 3', account.gallonBalance.remainingGallons === 3, account.gallonBalance);
check('contract body filled', account.contract.contractBody.includes('MARIA CLARA SANTOS') && !account.contract.contractBody.includes('{{'), account.contract.contractBody);

// --- Validation and role checks ---
await call('POST', '/customer-orders', { token: customerToken, body: { gallonsOrdered: 0, paymentType: 'Cash' }, expectStatus: 400 });
await call('GET', '/credits', { token: customerToken, expectStatus: 403 });
await call('GET', '/customers/me', { expectStatus: 401 });

// --- Order 1: Cash via GCash ---
const order1 = await call('POST', '/customer-orders', {
  token: customerToken,
  body: { gallonsOrdered: 3, returnedGallons: 2, paymentType: 'Cash', paymentMode: 'GCash', paymentReference: '1234567890', customerNotes: 'Gate is blue' },
  expectStatus: 201,
});
check('order total = 3 x 25', order1.totalAmount === 75, order1);
const counts = await call('GET', '/customer-orders/pending-count', { token: riderToken });
check('pending count = 1', counts.pendingCount === 1, counts);
await call('POST', '/employee-shifts/time-in', { token: riderToken, expectStatus: 201 });
await call('POST', '/employee-shifts/time-in', { token: riderToken, expectStatus: 409 });
const accepted = await call('PATCH', `/customer-orders/${order1.customerOrderId}/accept`, { token: riderToken });
check('order accepted & assigned', accepted.orderStatus === 'Accepted' && accepted.isAssignedToMe, accepted);
await call('PATCH', `/customer-orders/${order1.customerOrderId}/accept`, { token: ownerToken, expectStatus: 400 });
await call('PATCH', `/customer-orders/${order1.customerOrderId}/cancel`, { token: customerToken, body: {}, expectStatus: 400 });
await call('PATCH', '/employees/me/location', { token: riderToken, body: { latitude: 10.32, longitude: 123.89 } });
const tracking = await call('GET', `/customer-orders/${order1.customerOrderId}`, { token: customerToken });
check('customer sees rider location', tracking.handledBy?.lastLatitude === 10.32, tracking.handledBy);
await call('PATCH', `/customer-orders/${order1.customerOrderId}/deliver`, { token: riderToken, body: { returnedGallons: 5 }, expectStatus: 400 });
const delivered = await call('PATCH', `/customer-orders/${order1.customerOrderId}/deliver`, {
  token: riderToken,
  body: { returnedGallons: 2, paymentMode: 'GCash' },
});
check('cash order paid on delivery', delivered.orderStatus === 'Delivered' && delivered.paymentStatus === 'Paid', delivered);

// --- Order 2: Credit (utang) ---
const order2 = await call('POST', '/customer-orders', {
  token: customerToken,
  body: { gallonsOrdered: 4, returnedGallons: 3, paymentType: 'Credit' },
  expectStatus: 201,
});
await call('PATCH', `/customer-orders/${order2.customerOrderId}/accept`, { token: riderToken });
const delivered2 = await call('PATCH', `/customer-orders/${order2.customerOrderId}/deliver`, { token: riderToken, body: { returnedGallons: 3 } });
check('credit order stays unpaid', delivered2.paymentStatus === 'Unpaid', delivered2);

// --- Order 3: cancelled by customer, Order 4: declined by staff, Order 5: failed ---
const order3 = await call('POST', '/customer-orders', { token: customerToken, body: { gallonsOrdered: 1, paymentType: 'Cash' }, expectStatus: 201 });
await call('PATCH', `/customer-orders/${order3.customerOrderId}/cancel`, { token: customerToken, body: { reason: 'Changed my mind' } });
const order4 = await call('POST', '/customer-orders', { token: customerToken, body: { gallonsOrdered: 2, paymentType: 'Cash' }, expectStatus: 201 });
await call('PATCH', `/customer-orders/${order4.customerOrderId}/decline`, { token: riderToken, body: { reason: 'Out of stock' } });
const order5 = await call('POST', '/customer-orders', { token: customerToken, body: { gallonsOrdered: 2, paymentType: 'Credit' }, expectStatus: 201 });
await call('PATCH', `/customer-orders/${order5.customerOrderId}/accept`, { token: riderToken });
await call('PATCH', `/customer-orders/${order5.customerOrderId}/fail`, { token: riderToken, body: { reason: 'Customer not home' } });

// --- Customer view ---
const me = await call('GET', '/customers/me', { token: customerToken });
check('remaining gallons = 3 + (3-2) + (4-3) = 5', me.gallonBalance.remainingGallons === 5, me.gallonBalance);
check('unpaid balance = 100', me.credit.unpaidBalance === 100, me.credit);
const unpaid = await call('GET', '/customer-orders/mine?paymentType=Credit&paymentStatus=Unpaid&statuses=Delivered', { token: customerToken });
check('customer unpaid filter = 1 order', unpaid.length === 1, unpaid.map((o) => o.orderNumber));
const ledger = await call('GET', '/customers/me/ledger', { token: customerToken });
check('ledger running remaining 3 -> 4 -> 5', ledger.map((e) => e.remainingGallons).join(',') === '3,4,5', ledger);

// --- Credits ---
const credits = await call('GET', `/credits?search=maria`, { token: riderToken });
check('credits list has 1 unpaid order', credits.totalCount === 1 && credits.totalAmount === 100, credits);
await call('POST', '/credits/settle', { token: riderToken, body: { customerOrderIds: [order2.customerOrderId], paymentMode: 'Cash', paidOn: '2999-01-01' }, expectStatus: 400 });
const settled = await call('POST', '/credits/settle', { token: riderToken, body: { customerOrderIds: [order2.customerOrderId], paymentMode: 'Cash' } });
check('credit settled', settled.settledCount === 1 && settled.totalAmountPaid === 100, settled);
const creditsAfter = await call('GET', '/credits', { token: riderToken });
check('no unpaid credits left', creditsAfter.totalCount === 0, creditsAfter);

// --- Expenses, daily report, records ---
await call('POST', '/expenses', { token: riderToken, body: { expenseCategory: 'Fuel', amount: 120, description: 'Gasoline' }, expectStatus: 201 });
await call('POST', '/expenses', { token: riderToken, body: { expenseCategory: 'VehicleRepair', amount: 80, description: 'Flat tire' }, expectStatus: 201 });
const daily = await call('GET', '/reports/daily', { token: riderToken });
const s = daily.summary;
check('daily: 2 delivered, 1 declined, 1 failed', s.deliveredOrders === 2 && s.declinedOrders === 1 && s.failedOrders === 1, s);
check('daily: gallons 7 delivered, 5 returned', s.gallonsDelivered === 7 && s.gallonsReturned === 5, s);
check('daily: cash 75, credit 100, collections 100, expenses 200, net -25', s.cashSales === 75 && s.creditSales === 100 && s.collections === 100 && s.totalExpenses === 200 && s.netIncome === -25, s);
const adminDaily = await call('GET', '/reports/daily', { token: ownerToken });
check('admin daily includes customer-cancelled order', adminDaily.summary.cancelledOrders === 1 && adminDaily.transactions.length === 5, adminDaily.summary);
const records = await call('GET', '/customer-orders/records', { token: ownerToken });
check('records grid remaining 5 then 4', records.map((r) => r.remainingGallons).join(',') === '5,4', records);
const shift = await call('POST', '/employee-shifts/time-out', { token: riderToken, body: { remarks: 'Done' } });
check('shift snapshot saved', shift.totalDeliveredOrders === 2 && shift.totalExpenses === 200 && shift.timeOut !== null, shift);

// --- Admin: payment channels, reports, settings ---
await call('POST', '/payment-channels', { token: ownerToken, body: { channelType: 'GCash', channelName: 'GCash', accountName: 'Leo D.', accountNumber: '09171234567', qrImage: tinyPng }, expectStatus: 201 });
const channels = await call('GET', '/payment-channels', { token: customerToken });
check('customer sees QR channel', channels.length === 1 && channels[0].qrImage?.startsWith('data:image/png'), channels.length);
await call('PATCH', '/water-stations/mine', { token: riderToken, body: { pricePerGallon: 30 }, expectStatus: 403 });
await call('PATCH', '/water-stations/mine', { token: ownerToken, body: { pricePerGallon: 30 } });
const summary = await call('GET', '/reports/business-summary', { token: ownerToken });
check('business summary totals', summary.totals.gallonsDelivered === 7 && summary.totals.newCustomers === 1 && summary.months.length === 12, summary.totals);
const customers = await call('GET', '/customers?search=maria', { token: riderToken });
check('customer list remaining 5', customers[0]?.remainingGallons === 5, customers);
const employees = await call('GET', '/employees', { token: ownerToken });
check('employees list has owner + rider', employees.length === 2, employees);

// =====================================================================================
// Account security: devices (sessions), password, two-step verification, photo, activity
// =====================================================================================

/** Authenticator code (RFC 6238: HMAC-SHA1, 30 s, 6 digits) computed like the phone app does. */
function authenticatorCode(secretKey, unixTimeSeconds = Math.floor(Date.now() / 1000)) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secretKey].map((character) => alphabet.indexOf(character).toString(2).padStart(5, '0')).join('');
  const secret = Buffer.from(bits.match(/.{8}/g).map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(unixTimeSeconds / 30)));
  const hmac = createHmac('sha1', secret).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binaryCode % 1_000_000).padStart(6, '0');
}
/** A 6-digit code that is guaranteed to be wrong right now. */
const wrongCodeFor = (secretKey) => {
  const now = Math.floor(Date.now() / 1000);
  const validCodes = [now - 30, now, now + 30].map((time) => authenticatorCode(secretKey, time));
  return ['111111', '222222', '333333', '444444'].find((code) => !validCodes.includes(code));
};
const activityTypes = (activity) => activity.items.map((item) => item.activityType);
const signedOutMessage = 'You were signed out on this device. Please sign in again.';

const securityEmail = `sec.${runId}@aquatap.test`;
const pixel = { deviceName: 'Pixel 8 (test)', platform: 'Android', appVersion: '1.0.0' };

// --- Sign-in shape and devices ---
const sessionA = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail, device: pixel } });
check('sign-in response has the new shape', sessionA.requiresTwoFactor === false && sessionA.twoFactorToken === null && typeof sessionA.accessToken === 'string', sessionA);
check('profile has the new security fields', sessionA.profile.avatarImage === null && sessionA.profile.hasPassword === false && sessionA.profile.isTwoFactorEnabled === false && Number.isInteger(sessionA.profile.currentSessionId), sessionA.profile);
await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail, device: { deviceName: 'X', platform: 'Toaster' } }, expectStatus: 400 });
const sessionB = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail, device: { deviceName: 'Chrome on Windows', platform: 'Web' } } });
const sessionC = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail } });
const devices = await call('GET', '/account/sessions', { token: sessionA.accessToken });
check('3 devices listed, this device first', devices.length === 3 && devices[0].isCurrent && devices[0].deviceName === 'Pixel 8 (test)' && devices[0].platform === 'Android' && devices[0].appVersion === '1.0.0' && devices[0].userSessionId === sessionA.profile.currentSessionId, devices);
check('device details listed', devices.some((d) => d.deviceName === 'Chrome on Windows' && d.platform === 'Web' && !d.isCurrent) && devices.some((d) => d.deviceName === 'Unknown device' && d.platform === 'Unknown') && devices.every((d) => d.signInMethod === 'Developer' && d.ipAddress && d.signedInAt && d.lastActiveAt), devices);

await call('DELETE', `/account/sessions/${sessionC.profile.currentSessionId}`, { token: sessionA.accessToken, expectStatus: 204 });
const afterDeviceSignOut = await call('GET', '/auth/me', { token: sessionC.accessToken, expectStatus: 401 });
check('signed-out device gets a clear message', afterDeviceSignOut.message === signedOutMessage, afterDeviceSignOut);
await call('DELETE', `/account/sessions/${sessionC.profile.currentSessionId}`, { token: sessionA.accessToken, expectStatus: 404 });
await call('DELETE', `/account/sessions/${ownerProfile.currentSessionId}`, { token: sessionA.accessToken, expectStatus: 404 });
await call('GET', '/auth/me', { token: ownerToken });
const signOutOthers = await call('POST', '/account/sessions/sign-out-others', { token: sessionA.accessToken });
check('sign-out-others signed out 1 device', signOutOthers.signedOutCount === 1, signOutOthers);
await call('GET', '/auth/me', { token: sessionB.accessToken, expectStatus: 401 });
await call('POST', '/auth/sign-out', { token: sessionA.accessToken, expectStatus: 204 });
await call('GET', '/auth/me', { token: sessionA.accessToken, expectStatus: 401 });

// --- Password ---
const session1 = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail, device: pixel } });
await call('PUT', '/account/password', { token: session1.accessToken, body: { newPassword: 'short1' }, expectStatus: 400 });
await call('PUT', '/account/password', { token: session1.accessToken, body: { newPassword: 'onlyletters' }, expectStatus: 400 });
await call('PUT', '/account/password', { token: session1.accessToken, body: { newPassword: 'Tubig2026' }, expectStatus: 204 });
const profileWithPassword = await call('GET', '/auth/me', { token: session1.accessToken });
check('profile shows a password is set', profileWithPassword.hasPassword === true, profileWithPassword);
const session2 = await call('POST', '/auth/password', { body: { email: securityEmail, password: 'Tubig2026', device: { deviceName: 'iPhone (test)', platform: 'iOS' } } });
check('password sign-in works', session2.requiresTwoFactor === false && typeof session2.accessToken === 'string', session2);
const wrongPassword = await call('POST', '/auth/password', { body: { email: securityEmail, password: 'Wrong12345' }, expectStatus: 401 });
const unknownEmail = await call('POST', '/auth/password', { body: { email: `nobody.${runId}@aquatap.test`, password: 'Tubig2026' }, expectStatus: 401 });
check('wrong password and unknown email give the same message', wrongPassword.message === 'Wrong email or password.' && unknownEmail.message === wrongPassword.message, [wrongPassword, unknownEmail]);
await call('PUT', '/account/password', { token: session2.accessToken, body: { newPassword: 'Gallon2027' }, expectStatus: 400 });
const wrongCurrent = await call('PUT', '/account/password', { token: session2.accessToken, body: { currentPassword: 'Wrong12345', newPassword: 'Gallon2027' }, expectStatus: 400 });
check('wrong current password is 400, not 401', wrongCurrent.message === 'Your current password is not correct.', wrongCurrent);
await call('PUT', '/account/password', { token: session2.accessToken, body: { currentPassword: 'Tubig2026', newPassword: 'Tubig2026' }, expectStatus: 400 });
await call('PUT', '/account/password', { token: session2.accessToken, body: { currentPassword: 'Tubig2026', newPassword: 'Gallon2027' }, expectStatus: 204 });
await call('GET', '/auth/me', { token: session1.accessToken, expectStatus: 401 });
const devicesAfterPasswordChange = await call('GET', '/account/sessions', { token: session2.accessToken });
check('password change signed out the other devices', devicesAfterPasswordChange.length === 1 && devicesAfterPasswordChange[0].isCurrent && devicesAfterPasswordChange[0].signInMethod === 'Password', devicesAfterPasswordChange);
await call('POST', '/auth/password', { body: { email: securityEmail, password: 'Tubig2026' }, expectStatus: 401 });
const session3 = await call('POST', '/auth/password', { body: { email: securityEmail, password: 'Gallon2027', device: pixel } });
check('new password works', typeof session3.accessToken === 'string', session3);
const securityToken = session3.accessToken;

// Lockout: 5 wrong passwords lock password sign-in for 15 minutes (separate account).
const lockedEmail = `lock.${runId}@aquatap.test`;
const lockedAccountSession = await call('POST', '/auth/dev-sign-in', { body: { email: lockedEmail } });
await call('PUT', '/account/password', { token: lockedAccountSession.accessToken, body: { newPassword: 'Station2026' }, expectStatus: 204 });
for (let attempt = 1; attempt <= 5; attempt += 1) {
  await call('POST', '/auth/password', { body: { email: lockedEmail, password: `Wrong${attempt}000` }, expectStatus: 401 });
}
const locked = await call('POST', '/auth/password', { body: { email: lockedEmail, password: 'Station2026' }, expectStatus: 429 });
check('account locked after 5 wrong passwords', /^Too many wrong attempts\. Please try again in \d+ minutes?\.$/.test(locked.message), locked);

// --- Two-step verification (2FA) ---
await call('POST', '/account/two-factor/enable', { token: securityToken, body: { code: '123456' }, expectStatus: 400 });
const setup = await call('POST', '/account/two-factor/setup', { token: securityToken });
check('2FA setup returns key, link and QR code', /^[A-Z2-7]{32}$/.test(setup.secretKey) && setup.otpauthUrl.startsWith('otpauth://totp/AquaTap:') && setup.otpauthUrl.includes(`secret=${setup.secretKey}`) && setup.qrCodeDataUri.startsWith('data:image/png;base64,'), setup);
await call('POST', '/account/two-factor/enable', { token: securityToken, body: { code: wrongCodeFor(setup.secretKey) }, expectStatus: 400 });
const notYetEnabled = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail } });
check('2FA is not required before it is confirmed', notYetEnabled.requiresTwoFactor === false, notYetEnabled);
const enabled = await call('POST', '/account/two-factor/enable', { token: securityToken, body: { code: authenticatorCode(setup.secretKey) } });
check('8 backup codes returned', enabled.recoveryCodes.length === 8 && new Set(enabled.recoveryCodes).size === 8 && enabled.recoveryCodes.every((code) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)), enabled);
await call('POST', '/account/two-factor/setup', { token: securityToken, expectStatus: 409 });
const profileWith2fa = await call('GET', '/auth/me', { token: securityToken });
check('profile shows 2FA is on', profileWith2fa.isTwoFactorEnabled === true, profileWith2fa);

const firstStep = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail, device: pixel } });
check('sign-in now asks for the code', firstStep.requiresTwoFactor === true && firstStep.accessToken === null && firstStep.profile === null && typeof firstStep.twoFactorToken === 'string', firstStep);
await call('GET', '/auth/me', { token: firstStep.twoFactorToken, expectStatus: 401 });
await call('GET', '/account/sessions', { token: firstStep.twoFactorToken, expectStatus: 401 });
const wrongCode = await call('POST', '/auth/two-factor', { body: { twoFactorToken: firstStep.twoFactorToken, code: wrongCodeFor(setup.secretKey) }, expectStatus: 401 });
check('wrong code is rejected', wrongCode.message.startsWith('That code is not correct'), wrongCode);
await call('POST', '/auth/two-factor', { body: { twoFactorToken: securityToken, code: authenticatorCode(setup.secretKey) }, expectStatus: 401 });
const secondStep = await call('POST', '/auth/two-factor', { body: { twoFactorToken: firstStep.twoFactorToken, code: authenticatorCode(setup.secretKey), device: pixel } });
check('right code signs in', secondStep.requiresTwoFactor === false && typeof secondStep.accessToken === 'string' && secondStep.profile.isTwoFactorEnabled === true, secondStep);
await call('GET', '/auth/me', { token: secondStep.accessToken });

const passwordFirstStep = await call('POST', '/auth/password', { body: { email: securityEmail, password: 'Gallon2027' } });
check('password sign-in also asks for the code', passwordFirstStep.requiresTwoFactor === true, passwordFirstStep);
const backupCodeSignIn = await call('POST', '/auth/two-factor', { body: { twoFactorToken: passwordFirstStep.twoFactorToken, code: enabled.recoveryCodes[0].toLowerCase(), device: { deviceName: 'Backup phone (test)', platform: 'Android' } } });
check('a backup code signs in', typeof backupCodeSignIn.accessToken === 'string', backupCodeSignIn);
const backupDevices = await call('GET', '/account/sessions', { token: backupCodeSignIn.accessToken });
check('2FA session keeps the first-step method', backupDevices[0].deviceName === 'Backup phone (test)' && backupDevices[0].signInMethod === 'Password', backupDevices[0]);
const anotherFirstStep = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail } });
await call('POST', '/auth/two-factor', { body: { twoFactorToken: anotherFirstStep.twoFactorToken, code: enabled.recoveryCodes[0] }, expectStatus: 401 });

const regenerated = await call('POST', '/account/two-factor/recovery-codes', { token: securityToken, body: { code: authenticatorCode(setup.secretKey) } });
check('new backup codes replace the old ones', regenerated.recoveryCodes.length === 8 && !regenerated.recoveryCodes.includes(enabled.recoveryCodes[1]), regenerated);
await call('POST', '/account/two-factor/disable', { token: securityToken, body: { code: enabled.recoveryCodes[1] }, expectStatus: 400 });
await call('POST', '/account/two-factor/disable', { token: securityToken, body: { code: wrongCodeFor(setup.secretKey) }, expectStatus: 400 });
await call('GET', '/auth/me', { token: securityToken });
await call('POST', '/account/two-factor/disable', { token: securityToken, body: { code: regenerated.recoveryCodes[0] }, expectStatus: 204 });
const after2faOff = await call('POST', '/auth/dev-sign-in', { body: { email: securityEmail } });
check('2FA off: sign-in is one step again', after2faOff.requiresTwoFactor === false && after2faOff.profile.isTwoFactorEnabled === false, after2faOff);
await call('POST', '/account/two-factor/disable', { token: securityToken, body: { code: '123456' }, expectStatus: 400 });

// --- Profile photo ---
const bigPhoto = await sharp({ create: { width: 1000, height: 750, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } }).png().toBuffer();
const bigPhotoDataUri = `data:image/png;base64,${bigPhoto.toString('base64')}`;
const withAvatar = await call('PUT', '/account/avatar', { token: securityToken, body: { imageDataUri: bigPhotoDataUri } });
const avatarMetadata = await sharp(Buffer.from(withAvatar.avatarImage.split(',')[1], 'base64')).metadata();
check('photo is saved as a 256 x 256 JPEG', withAvatar.avatarImage.startsWith('data:image/jpeg;base64,') && avatarMetadata.format === 'jpeg' && avatarMetadata.width === 256 && avatarMetadata.height === 256, avatarMetadata);
check('saved photo is much smaller than the upload', withAvatar.avatarImage.length < 120_000 && withAvatar.avatarImage.length < bigPhotoDataUri.length / 20, { saved: withAvatar.avatarImage.length, uploaded: bigPhotoDataUri.length });
const profileWithAvatar = await call('GET', '/auth/me', { token: securityToken });
check('profile returns the photo', profileWithAvatar.avatarImage === withAvatar.avatarImage, profileWithAvatar.avatarImage?.length);
await call('PUT', '/account/avatar', { token: securityToken, body: { imageDataUri: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, expectStatus: 400 });
await call('PUT', '/account/avatar', { token: securityToken, body: { imageDataUri: 'data:image/png;base64,QUJDREVGR0g=' }, expectStatus: 400 });
const withoutAvatar = await call('DELETE', '/account/avatar', { token: securityToken });
check('photo removed', withoutAvatar.avatarImage === null, withoutAvatar.avatarImage);
const renamed = await call('PATCH', '/auth/me', { token: securityToken, body: { fullName: 'ana  security tester' } });
check('name updated', renamed.fullName === 'ANA SECURITY TESTER', renamed.fullName);

// --- Activity log ---
const activity = await call('GET', '/account/activity?limit=100', { token: securityToken });
const recordedTypes = activityTypes(activity);
const expectedSecurityTypes = ['SignedIn', 'SignedOut', 'DeviceSignedOut', 'OtherDevicesSignedOut', 'PasswordSet', 'PasswordChanged', 'SignInFailed', 'TwoFactorEnabled', 'TwoFactorDisabled', 'RecoveryCodesRegenerated', 'AvatarChanged', 'AvatarRemoved', 'ProfileUpdated'];
check('activity log has every security and profile event', expectedSecurityTypes.every((type) => recordedTypes.includes(type)), expectedSecurityTypes.filter((type) => !recordedTypes.includes(type)));
const descriptions = activity.items.map((item) => item.description);
check('activity uses plain sentences', ['Signed in on Pixel 8 (test)', 'Signed out on Pixel 8 (test)', 'Signed out the device Unknown device', 'Signed out 1 other device', 'Set a password', 'Changed password and signed out 1 other device', 'Turned on two-step verification', 'Turned off two-step verification', 'Created new backup codes', 'Changed profile photo', 'Removed profile photo', 'Changed name to ANA SECURITY TESTER', 'Someone entered a wrong password on Unknown device'].every((sentence) => descriptions.includes(sentence)), descriptions);
check('activity is newest first with device and IP', activity.items.every((item, index) => index === 0 || item.accountActivityId < activity.items[index - 1].accountActivityId) && activity.items[0].ipAddress && activity.items[0].deviceName === 'Pixel 8 (test)' && activity.items[0].createdAt, activity.items[0]);
const page1 = await call('GET', '/account/activity?limit=5', { token: securityToken });
check('activity page 1 has 5 entries and a cursor', page1.items.length === 5 && page1.nextBeforeId === page1.items[4].accountActivityId, page1.nextBeforeId);
const page2 = await call('GET', `/account/activity?limit=5&beforeId=${page1.nextBeforeId}`, { token: securityToken });
check('activity page 2 continues without overlap', page2.items.length === 5 && page2.items.every((item) => item.accountActivityId < page1.nextBeforeId), page2.items.map((item) => item.accountActivityId));
const lastPage = await call('GET', '/account/activity?limit=100&beforeId=' + activity.items.at(-1).accountActivityId, { token: securityToken });
check('activity last page ends the list', lastPage.items.length === 0 && lastPage.nextBeforeId === null, lastPage);
const profileActivity = await call('GET', '/account/activity?category=Profile', { token: securityToken });
check('activity category filter', profileActivity.items.length >= 3 && profileActivity.items.every((item) => item.activityCategory === 'Profile'), profileActivity.items.map((item) => item.activityCategory));
await call('GET', '/account/activity?limit=0', { token: securityToken, expectStatus: 400 });
await call('GET', '/account/activity?category=Everything', { token: securityToken, expectStatus: 400 });
await call('GET', '/account/activity', { expectStatus: 401 });

const customerActivity = await call('GET', '/account/activity?limit=100', { token: customerToken });
const customerDescriptions = customerActivity.items.map((item) => item.description);
check('customer activity: contract, orders, cancel', ['ContractSigned', 'OrderPlaced', 'OrderCancelled', 'SignedIn'].every((type) => activityTypes(customerActivity).includes(type)) && customerDescriptions.includes(`Placed order ${order1.orderNumber} for 3 gallons (₱75.00)`) && customerDescriptions.includes(`Cancelled order ${order3.orderNumber}`) && customerDescriptions.some((description) => description.startsWith('Signed the gallon borrowing agreement with AquaTap Test') && description.endsWith('(3 borrowed gallons)')), customerDescriptions);
check('customer does not see other accounts in the log', !activityTypes(customerActivity).includes('OrderAccepted'), activityTypes(customerActivity));
const riderActivity = await call('GET', '/account/activity?limit=100', { token: riderToken });
const riderDescriptions = riderActivity.items.map((item) => item.description);
check('rider activity: orders, payments, shift', ['OrderAccepted', 'OrderDeclined', 'OrderDelivered', 'OrderFailed', 'CreditsSettled', 'ShiftStarted', 'ShiftEnded', 'ExpenseAdded'].every((type) => activityTypes(riderActivity).includes(type)) && riderDescriptions.includes('Marked 1 order as paid (₱100.00)') && riderDescriptions.includes(`Delivered order ${order1.orderNumber} of MARIA CLARA SANTOS: 3 gallons, ₱75.00`) && riderDescriptions.includes('Added an expense: Vehicle repair ₱80.00') && riderDescriptions.some((description) => /^Timed out: 2 deliveries, cash on hand -?₱[\d,]+\.\d{2}$/.test(description)), riderDescriptions);
const ownerActivity = await call('GET', '/account/activity?limit=100&category=Station', { token: ownerToken });
check('owner activity: station, documents, employee, payment account', ['StationRegistered', 'BusinessInfoUpdated', 'StationDocumentUploaded', 'VerificationSubmitted', 'EmployeeInvited', 'PaymentChannelAdded', 'StationUpdated'].every((type) => activityTypes(ownerActivity).includes(type)) && ownerActivity.items.some((item) => item.description === 'Uploaded a business document: BIR Certificate of Registration') && ownerActivity.items.some((item) => item.description === 'Invited the employee JUAN RIDER'), ownerActivity.items.map((item) => item.description));
const reviewerActivity = await call('GET', '/account/activity?category=Station', { token: reviewerToken });
check('reviewer activity: approve and reject', ['StationApproved', 'StationRejected'].every((type) => activityTypes(reviewerActivity).includes(type)), activityTypes(reviewerActivity));

// --- Rate limit on password sign-in (keep this last: it blocks further password sign-ins for a minute) ---
let rateLimited = null;
for (let attempt = 1; attempt <= 60 && !rateLimited; attempt += 1) {
  const response = await fetch(`${BASE_URL}/auth/password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `nobody.${runId}@aquatap.test`, password: 'Guess12345' }) });
  if (response.status === 429) rateLimited = { attempt, body: await response.json() };
}
check('password sign-in is rate limited per IP', rateLimited !== null && rateLimited.body.message === 'Too many attempts. Please wait a minute and try again.', rateLimited);
const stillWorks = await call('GET', '/auth/me', { token: securityToken });
check('other routes are not rate limited', stillWorks.email === securityEmail, stillWorks);

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
