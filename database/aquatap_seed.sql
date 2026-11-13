-- =====================================================================
--  AquaTap demo data (optional) - run ONCE after aquatap_schema.sql
--  Creates one station with an owner, a rider and two customers plus
--  about 5 months of orders, payments and expenses for the reports.
--
--  Demo accounts (use "Developer sign-in" while AUTH_DEV_SIGN_IN_ENABLED=true):
--    owner@aquatap.test  -> Admin (station owner)
--    rider@aquatap.test  -> Employee (delivery rider)
--    juan@aquatap.test   -> Customer
--    maria@aquatap.test  -> Customer
--    admin@aquatap.test  -> SystemAdmin (AquaTap reviewer of station KYB documents;
--                           also listed in SYSTEM_ADMIN_EMAILS of backend/.env)
--  Running it twice stops at the first statement (duplicate email), so nothing is duplicated.
-- =====================================================================

USE aquatap_db;

-- Accounts first: the unique Email makes a second run fail immediately.
INSERT INTO UserAccount (Email, FullName, UserRole) VALUES ('owner@aquatap.test', 'LEO ISIDRO DUMANGAS', 'Admin');
SET @OwnerAccountID = LAST_INSERT_ID();
INSERT INTO UserAccount (Email, FullName, UserRole) VALUES ('rider@aquatap.test', 'PEDRO SANTOS REYES', 'Employee');
SET @RiderAccountID = LAST_INSERT_ID();
INSERT INTO UserAccount (Email, FullName, UserRole) VALUES ('juan@aquatap.test', 'JUAN DELA CRUZ', 'Customer');
SET @JuanAccountID = LAST_INSERT_ID();
INSERT INTO UserAccount (Email, FullName, UserRole) VALUES ('maria@aquatap.test', 'MARIA CLARA SANTOS', 'Customer');
SET @MariaAccountID = LAST_INSERT_ID();
INSERT INTO UserAccount (Email, FullName, UserRole) VALUES ('admin@aquatap.test', 'AQUATAP REVIEWER', 'SystemAdmin');

-- The demo station already passed KYB verification so customers can find it.
INSERT INTO WaterStation (StationName, RegisteredBusinessName, TaxIdentificationNumber, Address, ContactNumber, Latitude, Longitude,
                          PricePerGallon, VerificationStatus, VerificationSubmittedAt, VerifiedAt)
VALUES ('AquaTap Demo Water Refilling', 'DUMANGAS WATER REFILLING STATION', '123-456-789-000', 'Gorordo Ave., Lahug, Cebu City',
        '09171234567', 10.3301000, 123.8990000, 25.00, 'Verified', DATE_SUB(NOW(), INTERVAL 160 DAY), DATE_SUB(NOW(), INTERVAL 158 DAY));
SET @StationID = LAST_INSERT_ID();

UPDATE UserAccount SET WaterStationID = @StationID
 WHERE UserAccountID IN (@OwnerAccountID, @RiderAccountID, @JuanAccountID, @MariaAccountID);

INSERT INTO Employee (WaterStationID, UserAccountID, FullName, Email, ContactNumber, IsOwner)
VALUES (@StationID, @OwnerAccountID, 'LEO ISIDRO DUMANGAS', 'owner@aquatap.test', '09171234567', 1);
INSERT INTO Employee (WaterStationID, UserAccountID, FullName, Email, ContactNumber, IsOwner)
VALUES (@StationID, @RiderAccountID, 'PEDRO SANTOS REYES', 'rider@aquatap.test', '09181112222', 0);
SET @RiderID = LAST_INSERT_ID();

INSERT INTO Customer (WaterStationID, UserAccountID, FullName, Address, Occupation, ContactNumber, Landmark, Latitude, Longitude, CreatedAt)
VALUES (@StationID, @JuanAccountID, 'JUAN DELA CRUZ', 'Purok 2, Brgy. Apas, Cebu City', 'Jeepney driver', '09223334444',
        'Green gate beside sari-sari store', 10.3365000, 123.9060000, DATE_SUB(NOW(), INTERVAL 155 DAY));
SET @JuanID = LAST_INSERT_ID();
INSERT INTO Customer (WaterStationID, UserAccountID, FullName, Address, Occupation, ContactNumber, Landmark, Latitude, Longitude, CreatedAt)
VALUES (@StationID, @MariaAccountID, 'MARIA CLARA SANTOS', 'Sitio Kalubihan, Brgy. Lahug, Cebu City', 'Teacher', '09335556666',
        'Near the chapel', 10.3270000, 123.8950000, DATE_SUB(NOW(), INTERVAL 105 DAY));
SET @MariaID = LAST_INSERT_ID();

SET @Signature = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140"><path d="M20 90 C 50 30, 80 30, 100 85 S 150 120, 175 70 S 230 40, 260 80 L 300 75" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';

INSERT INTO GallonContract (CustomerID, WaterStationID, FullName, Address, Occupation, ContactNumber, BorrowedGallons, ContractBody, SignatureSvg, SignedAt)
VALUES (@JuanID, @StationID, 'JUAN DELA CRUZ', 'Purok 2, Brgy. Apas, Cebu City', 'Jeepney driver', '09223334444', 3,
        'GALLON BORROWING AGREEMENT\n\nI, JUAN DELA CRUZ, borrowed 3 water gallon container(s) from AquaTap Demo Water Refilling and agree to return the same number of empty containers whenever I order refills.',
        @Signature, DATE_SUB(NOW(), INTERVAL 155 DAY)),
       (@MariaID, @StationID, 'MARIA CLARA SANTOS', 'Sitio Kalubihan, Brgy. Lahug, Cebu City', 'Teacher', '09335556666', 2, NULL,
        @Signature, DATE_SUB(NOW(), INTERVAL 105 DAY));

-- Orders: (customer, days ago, ordered, returned, type, mode, status, paid days ago)
INSERT INTO CustomerOrder (OrderNumber, WaterStationID, CustomerID, EmployeeID, GallonsOrdered, ReturnedGallons, PricePerGallon, TotalAmount,
                           PaymentType, PaymentMode, PaymentStatus, PaymentReference, DeliveryAddress, DeliveryLatitude, DeliveryLongitude,
                           OrderStatus, StatusReason, OrderedAt, AcceptedAt, DeliveredAt, ClosedAt, PaidAt)
VALUES
 ('AQDEMO-J001', @StationID, @JuanID, @RiderID, 3, 3, 25, 75, 'Cash', 'Cash', 'Paid', NULL, 'Purok 2, Brgy. Apas, Cebu City', 10.3365, 123.906, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 150 DAY), DATE_SUB(NOW(), INTERVAL 150 DAY), DATE_SUB(NOW(), INTERVAL 150 DAY), DATE_SUB(NOW(), INTERVAL 150 DAY), DATE_SUB(NOW(), INTERVAL 150 DAY)),
 ('AQDEMO-J002', @StationID, @JuanID, @RiderID, 3, 3, 25, 75, 'Credit', 'GCash', 'Paid', '1009-555-0001', 'Purok 2, Brgy. Apas, Cebu City', 10.3365, 123.906, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_SUB(NOW(), INTERVAL 112 DAY)),
 ('AQDEMO-J003', @StationID, @JuanID, @RiderID, 4, 3, 25, 100, 'Cash', 'GCash', 'Paid', '1009-555-0002', 'Purok 2, Brgy. Apas, Cebu City', 10.3365, 123.906, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY)),
 ('AQDEMO-J004', @StationID, @JuanID, @RiderID, 4, 4, 25, 100, 'Credit', NULL, 'Unpaid', NULL, 'Purok 2, Brgy. Apas, Cebu City', 10.3365, 123.906, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), NULL),
 ('AQDEMO-J005', @StationID, @JuanID, @RiderID, 4, 4, 25, 100, 'Cash', 'Cash', 'Paid', NULL, 'Purok 2, Brgy. Apas, Cebu City', 10.3365, 123.906, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY)),
 ('AQDEMO-J006', @StationID, @JuanID, @RiderID, 3, 4, 25, 75, 'Credit', NULL, 'Unpaid', NULL, 'Purok 2, Brgy. Apas, Cebu City', 10.3365, 123.906, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), NULL),
 ('AQDEMO-J007', @StationID, @JuanID, NULL, 3, 3, 25, 75, 'Cash', 'Cash', 'Unpaid', NULL, 'Purok 2, Brgy. Apas, Cebu City', 10.3365, 123.906, 'Pending', NULL,
  DATE_SUB(NOW(), INTERVAL 10 MINUTE), NULL, NULL, NULL, NULL),
 ('AQDEMO-M001', @StationID, @MariaID, @RiderID, 2, 2, 25, 50, 'Cash', 'Cash', 'Paid', NULL, 'Sitio Kalubihan, Brgy. Lahug, Cebu City', 10.327, 123.895, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 100 DAY), DATE_SUB(NOW(), INTERVAL 100 DAY), DATE_SUB(NOW(), INTERVAL 100 DAY), DATE_SUB(NOW(), INTERVAL 100 DAY), DATE_SUB(NOW(), INTERVAL 100 DAY)),
 ('AQDEMO-M002', @StationID, @MariaID, @RiderID, 3, 2, 25, 75, 'Credit', 'BankTransfer', 'Paid', 'BDO-778812', 'Sitio Kalubihan, Brgy. Lahug, Cebu City', 10.327, 123.895, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 40 DAY)),
 ('AQDEMO-M003', @StationID, @MariaID, @RiderID, 3, 3, 25, 75, 'Credit', NULL, 'Unpaid', NULL, 'Sitio Kalubihan, Brgy. Lahug, Cebu City', 10.327, 123.895, 'Delivered', NULL,
  DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), NULL),
 ('AQDEMO-M004', @StationID, @MariaID, @RiderID, 2, 0, 25, 50, 'Cash', 'Cash', 'Unpaid', NULL, 'Sitio Kalubihan, Brgy. Lahug, Cebu City', 10.327, 123.895, 'Declined', 'Out of stock',
  DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL),
 ('AQDEMO-M005', @StationID, @MariaID, @RiderID, 2, 2, 25, 50, 'Cash', 'GCash', 'Unpaid', NULL, 'Sitio Kalubihan, Brgy. Lahug, Cebu City', 10.327, 123.895, 'Accepted', NULL,
  DATE_SUB(NOW(), INTERVAL 40 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE), NULL, NULL, NULL);

-- Every paid order gets its Payment record (date of payment = PaidAt).
INSERT INTO Payment (CustomerOrderID, WaterStationID, CustomerID, EmployeeID, AmountPaid, PaymentMode, ReferenceNumber, PaidAt, Remarks)
SELECT CustomerOrderID, WaterStationID, CustomerID, EmployeeID, TotalAmount, PaymentMode, PaymentReference, PaidAt,
       IF(PaymentType = 'Cash', 'Paid upon delivery', 'Credit (utang) payment')
  FROM CustomerOrder
 WHERE OrderNumber LIKE 'AQDEMO-%' AND PaymentStatus = 'Paid';

INSERT INTO Expense (WaterStationID, EmployeeID, ExpenseCategory, Amount, Description, ExpenseDate)
VALUES (@StationID, @RiderID, 'Fuel', 150, 'Gasoline 2L', DATE(DATE_SUB(NOW(), INTERVAL 150 DAY))),
       (@StationID, @RiderID, 'Food', 80, 'Lunch', DATE(DATE_SUB(NOW(), INTERVAL 120 DAY))),
       (@StationID, @RiderID, 'VehicleRepair', 120, 'Flat tire vulcanize', DATE(DATE_SUB(NOW(), INTERVAL 90 DAY))),
       (@StationID, NULL, 'Supplies', 450, 'Bottle caps and seals', DATE(DATE_SUB(NOW(), INTERVAL 60 DAY))),
       (@StationID, @RiderID, 'Fuel', 160, 'Gasoline 2L', DATE(DATE_SUB(NOW(), INTERVAL 30 DAY))),
       (@StationID, @RiderID, 'Food', 90, 'Merienda', DATE(DATE_SUB(NOW(), INTERVAL 5 DAY)));

INSERT INTO PaymentChannel (WaterStationID, ChannelType, ChannelName, AccountName, AccountNumber)
VALUES (@StationID, 'GCash', 'GCash', 'LEO I. DUMANGAS', '09171234567'),
       (@StationID, 'BankTransfer', 'BDO', 'LEO I. DUMANGAS', '0012-3456-7890');
