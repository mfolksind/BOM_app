import * as XLSX from "xlsx";

/**
 * Universal Master Reference Dictionary for Cable Manufacturing Data Entry
 */
export const ALLOWED_CHOICES_DICTIONARY = [
    {
        Category: "Raw Material Units (Base Unit)",
        ValidValues: "KG, METER, KM, PCS, PIECE, ROLL, DRUM, LITER",
        DefaultValue: "KG",
        Description: "Unit of measurement for stock tracking and BOM consumption.",
    },
    {
        Category: "Raw Material Categories",
        ValidValues: "COPPER, ALUMINUM, PVC_COMPOUND, XLPE_COMPOUND, GI_WIRE_STRIP, TAPE_BINDING, MASTERBATCH, PACKING_MATERIAL, CHEMICAL_SOLVENT, OTHER",
        DefaultValue: "COPPER",
        Description: "Classification of raw materials used in cable extrusion and winding.",
    },
    {
        Category: "Cable Categories",
        ValidValues: "LT_POWER, HT_POWER, CONTROL, INSTRUMENTATION, SOLAR, HOUSE_WIRE, SUBMERSIBLE",
        DefaultValue: "LT_POWER",
        Description: "Cable application class.",
    },
    {
        Category: "Voltage Grades",
        ValidValues: "1.1KV, 3.3KV, 6.6KV, 11KV, 22KV, 33KV",
        DefaultValue: "1.1KV",
        Description: "Voltage insulation rating (IS:7098 or IS:1554 standards).",
    },
    {
        Category: "Conductor Metals",
        ValidValues: "ALUMINUM, COPPER",
        DefaultValue: "ALUMINUM",
        Description: "Primary conductor metal (EC Grade Aluminium or Electrolytic Copper).",
    },
    {
        Category: "Insulation Types",
        ValidValues: "XLPE, PVC",
        DefaultValue: "XLPE",
        Description: "Primary core insulation compound.",
    },
    {
        Category: "Armour Types",
        ValidValues: "STRIP_ARMOURED, ROUND_WIRE_ARMOURED, DOUBLE_STEEL_TAPE, UNARMOURED",
        DefaultValue: "STRIP_ARMOURED",
        Description: "Mechanical armor protection applied over inner sheath.",
    },
    {
        Category: "Outer Sheath Types",
        ValidValues: "PVC_ST1, PVC_ST2, FRLS, ZHFR",
        DefaultValue: "PVC_ST2",
        Description: "External jacket polymer grade.",
    },
    {
        Category: "Warehouse Types",
        ValidValues: "RAW_MATERIAL, WORK_IN_PROGRESS, FINISHED_GOODS, SCRAP, PACKING_MATERIAL, CUSTOMER_SUPPLIED, QUARANTINE",
        DefaultValue: "RAW_MATERIAL",
        Description: "Physical storage zone in the factory or yard.",
    },
    {
        Category: "Drum Types",
        ValidValues: "WOODEN, STEEL, PLASTIC",
        DefaultValue: "WOODEN",
        Description: "Cable packaging drum structure.",
    },
    {
        Category: "Drum Ownership",
        ValidValues: "CUSTOMER_SUPPLIED, FACTORY_OWNED",
        DefaultValue: "CUSTOMER_SUPPLIED",
        Description: "Who owns the drum. Customer drums require return under RGP.",
    },
];

/**
 * Registry of available import templates with schema, validation, and sample records
 */
export const IMPORT_TEMPLATES = {
    CUSTOMERS: {
        key: "CUSTOMERS",
        sheetName: "1_Customers",
        title: "Customers Master",
        description: "Customer accounts, GSTIN, PAN, and contact details for job-work contracts.",
        endpoint: "/customers",
        bulkEndpoint: "/customers/import-bulk",
        fields: [
            { key: "code", label: "Customer Code", required: "MANDATORY", allowedValues: "Unique text (e.g. CUST-HVL-01)", example: "CUST-HVL-01" },
            { key: "name", label: "Customer Name", required: "MANDATORY", allowedValues: "Company Name", example: "Havells India Limited" },
            { key: "legalName", label: "Legal Name", required: "OPTIONAL", allowedValues: "Registered Trade Name", example: "Havells India Limited" },
            { key: "gstin", label: "GSTIN", required: "RECOMMENDED", allowedValues: "15-char GSTIN (e.g. 08AAACH1998L1ZU)", example: "08AAACH1998L1ZU" },
            { key: "pan", label: "PAN", required: "OPTIONAL", allowedValues: "10-char PAN (e.g. AAACH1998L)", example: "AAACH1998L" },
            { key: "contactPerson", label: "Contact Person", required: "OPTIONAL", allowedValues: "Name of Officer / Buyer", example: "Rajesh Sharma" },
            { key: "phone", label: "Phone", required: "OPTIONAL", allowedValues: "10-digit Mobile / Landline", example: "9876543210" },
            { key: "email", label: "Email", required: "OPTIONAL", allowedValues: "Valid Email Address", example: "procurement@havells.com" },
            { key: "street", label: "Street Address", required: "OPTIONAL", allowedValues: "Factory / Office Address", example: "Plot No. 2, Industrial Area" },
            { key: "city", label: "City", required: "OPTIONAL", allowedValues: "City Name", example: "Alwar" },
            { key: "state", label: "State", required: "OPTIONAL", allowedValues: "State Name", example: "Rajasthan" },
            { key: "postalCode", label: "Pincode", required: "OPTIONAL", allowedValues: "6-digit Postal Code", example: "301001" },
        ],
        sampleRows: [
            {
                "Customer Code": "CUST-HVL-01",
                "Customer Name": "Havells India Limited",
                "Legal Name": "Havells India Ltd",
                "GSTIN": "08AAACH1998L1ZU",
                "PAN": "AAACH1998L",
                "Contact Person": "Rajesh Sharma",
                "Phone": "9876543210",
                "Email": "rajesh@havells.com",
                "Street Address": "14/6 Mathura Road",
                "City": "Faridabad",
                "State": "Haryana",
                "Pincode": "121003",
            },
            {
                "Customer Code": "CUST-VMC-02",
                "Customer Name": "V-Marc India Limited",
                "Legal Name": "V-Marc India Ltd",
                "GSTIN": "05AAMCA4908L1ZG",
                "PAN": "AAMCA4908L",
                "Contact Person": "Sanjay Verma",
                "Phone": "9812345678",
                "Email": "purchase@v-marc.in",
                "Street Address": "Bhagwanpur Road, Mukrabpur",
                "City": "Roorkee",
                "State": "Uttarakhand",
                "Pincode": "247667",
            },
            {
                "Customer Code": "CUST-POL-03",
                "Customer Name": "Polycab India Limited",
                "Legal Name": "Polycab India Limited",
                "GSTIN": "24AAACP4926K1ZP",
                "PAN": "AAACP4926K",
                "Contact Person": "Anil Mehta",
                "Phone": "9825012345",
                "Email": "jobwork@polycab.com",
                "Street Address": "Halol-Vadodara Toll Highway",
                "City": "Vadodara",
                "State": "Gujarat",
                "Pincode": "391510",
            },
        ],
        transform: (row) => ({
            code: String(row["Customer Code"] || row.code || "").trim(),
            name: String(row["Customer Name"] || row.name || "").trim(),
            legalName: String(row["Legal Name"] || row.legalName || "").trim(),
            gstin: String(row["GSTIN"] || row.gstin || "").trim(),
            pan: String(row["PAN"] || row.pan || "").trim(),
            contactPerson: String(row["Contact Person"] || row.contactPerson || "Manager").trim(),
            phone: String(row["Phone"] || row.phone || "9999999999").trim(),
            email: String(row["Email"] || row.email || "info@customer.com").trim(),
            billingAddress: {
                street: String(row["Street Address"] || row.street || "Industrial Area").trim(),
                city: String(row["City"] || row.city || "Alwar").trim(),
                state: String(row["State"] || row.state || "Rajasthan").trim(),
                postalCode: String(row["Pincode"] || row.postalCode || "301707").trim(),
                country: "India",
            },
        }),
    },

    RAW_MATERIALS: {
        key: "RAW_MATERIALS",
        sheetName: "2_Raw_Materials",
        title: "Raw Materials Master",
        description: "Raw material items, HSN codes, standard unit rates, and categories.",
        endpoint: "/materials",
        bulkEndpoint: "/materials/import-bulk",
        fields: [
            { key: "code", label: "Material Code", required: "MANDATORY", allowedValues: "Unique identifier (e.g. RM-COP-8MM)", example: "RM-COP-8MM" },
            { key: "name", label: "Material Name", required: "MANDATORY", allowedValues: "Description of raw material", example: "Copper Continuous Cast Rod 8mm" },
            { key: "category", label: "Category", required: "MANDATORY", allowedValues: "COPPER, ALUMINUM, PVC_COMPOUND, XLPE_COMPOUND, GI_WIRE_STRIP, TAPE_BINDING, MASTERBATCH, OTHER", example: "COPPER" },
            { key: "baseUnit", label: "Base Unit", required: "MANDATORY", allowedValues: "KG, METER, KM, PCS, LITER, ROLL", example: "KG" },
            { key: "hsnCode", label: "HSN Code", required: "RECOMMENDED", allowedValues: "8-digit HSN code (e.g. 74081190, 76041010, 39011090)", example: "74081190" },
            { key: "standardRate", label: "Standard Rate (INR)", required: "OPTIONAL", allowedValues: "Price per Base Unit (e.g. 780.00)", example: "780.00" },
            { key: "description", label: "Description", required: "OPTIONAL", allowedValues: "Specification or grade details", example: "Electrolytic Grade Copper Rod" },
        ],
        sampleRows: [
            {
                "Material Code": "RM-COP-8MM",
                "Material Name": "Copper Continuous Cast Rod 8mm",
                "Category": "COPPER",
                "Base Unit": "KG",
                "HSN Code": "74081190",
                "Standard Rate (INR)": "780.00",
                "Description": "High conductivity copper rod for wire drawing",
            },
            {
                "Material Code": "RM-AL-EC",
                "Material Name": "EC Grade Aluminium Wire Rod 9.5mm",
                "Category": "ALUMINUM",
                "Base Unit": "KG",
                "HSN Code": "76041010",
                "Standard Rate (INR)": "225.00",
                "Description": "EC grade aluminum rod for power cables",
            },
            {
                "Material Code": "RM-XLPE-INS",
                "Material Name": "Cross-linked Polyethylene (XLPE) Compound",
                "Category": "XLPE_COMPOUND",
                "Base Unit": "KG",
                "HSN Code": "39011090",
                "Standard Rate (INR)": "145.00",
                "Description": "Natural XLPE insulation compound",
            },
            {
                "Material Code": "RM-PVC-ST2",
                "Material Name": "PVC Type ST-2 Sheathing Compound (Black)",
                "Category": "PVC_COMPOUND",
                "Base Unit": "KG",
                "HSN Code": "39042200",
                "Standard Rate (INR)": "98.00",
                "Description": "PVC sheathing compound as per IS 5831",
            },
            {
                "Material Code": "RM-GI-STRIP",
                "Material Name": "Galvanized Steel Armour Strip 4x0.8mm",
                "Category": "GI_WIRE_STRIP",
                "Base Unit": "KG",
                "HSN Code": "72172010",
                "Standard Rate (INR)": "88.00",
                "Description": "GI flat armour strip as per IS 3975",
            },
        ],
        transform: (row) => ({
            code: String(row["Material Code"] || row.code || "").trim(),
            name: String(row["Material Name"] || row.name || "").trim(),
            category: String(row["Category"] || row.category || "OTHER").trim().toUpperCase(),
            baseUnit: String(row["Base Unit"] || row.baseUnit || "KG").trim().toUpperCase(),
            hsnCode: String(row["HSN Code"] || row.hsnCode || "39011090").trim(),
            standardRate: parseFloat(row["Standard Rate (INR)"] || row.standardRate || 0) || 0,
            description: String(row["Description"] || row.description || "").trim(),
            moduleTags: ["INBOUND", "PRODUCTION"],
        }),
    },

    CABLE_PRODUCTS: {
        key: "CABLE_PRODUCTS",
        sheetName: "3_Cable_Products",
        title: "Cable Products Master",
        description: "Cable technical specifications, voltage grade, cores, cross-sections, and armor types.",
        endpoint: "/products",
        bulkEndpoint: "/products/import-bulk",
        fields: [
            { key: "code", label: "Product Code", required: "MANDATORY", allowedValues: "Unique code (e.g. CBL-4C-35-AL)", example: "CBL-4C-35-AL" },
            { key: "name", label: "Product Name / Size", required: "MANDATORY", allowedValues: "Cable Size (e.g. 4CX35 SQMM A2XFY)", example: "4CX35 SQMM A2XFY" },
            { key: "cableCategory", label: "Cable Category", required: "MANDATORY", allowedValues: "LT_POWER, HT_POWER, CONTROL, INSTRUMENTATION, SOLAR", example: "LT_POWER" },
            { key: "voltageGrade", label: "Voltage Grade", required: "MANDATORY", allowedValues: "1.1KV, 3.3KV, 6.6KV, 11KV, 33KV", example: "1.1KV" },
            { key: "coreCount", label: "Core Count", required: "MANDATORY", allowedValues: "Number of cores: 1, 2, 3, 3.5, 4, etc.", example: "4" },
            { key: "crossSectionSqMm", label: "Cross Section (sq mm)", required: "MANDATORY", allowedValues: "Numeric size in sq mm (e.g. 16, 25, 35, 50, 70, 95, 120, 185, 240, 300)", example: "35" },
            { key: "conductorMaterial", label: "Conductor Material", required: "MANDATORY", allowedValues: "ALUMINUM, COPPER", example: "ALUMINUM" },
            { key: "insulationType", label: "Insulation Type", required: "MANDATORY", allowedValues: "XLPE, PVC", example: "XLPE" },
            { key: "armourType", label: "Armour Type", required: "MANDATORY", allowedValues: "STRIP_ARMOURED, ROUND_WIRE_ARMOURED, DOUBLE_STEEL_TAPE, UNARMOURED", example: "STRIP_ARMOURED" },
            { key: "outerSheath", label: "Outer Sheath", required: "MANDATORY", allowedValues: "PVC_ST1, PVC_ST2, FRLS, ZHFR", example: "PVC_ST2" },
            { key: "baseUnit", label: "Base Unit", required: "MANDATORY", allowedValues: "METER, KM", example: "METER" },
        ],
        sampleRows: [
            {
                "Product Code": "CBL-4C-35-AL-XLPE",
                "Product Name / Size": "4CX35 SQMM A2XFY",
                "Cable Category": "LT_POWER",
                "Voltage Grade": "1.1KV",
                "Core Count": "4",
                "Cross Section (sq mm)": "35",
                "Conductor Material": "ALUMINUM",
                "Insulation Type": "XLPE",
                "Armour Type": "STRIP_ARMOURED",
                "Outer Sheath": "PVC_ST2",
                "Base Unit": "METER",
            },
            {
                "Product Code": "CBL-3.5C-185-AL",
                "Product Name / Size": "3.5CX185 SQMM A2XFY",
                "Cable Category": "LT_POWER",
                "Voltage Grade": "1.1KV",
                "Core Count": "4",
                "Cross Section (sq mm)": "185",
                "Conductor Material": "ALUMINUM",
                "Insulation Type": "XLPE",
                "Armour Type": "STRIP_ARMOURED",
                "Outer Sheath": "PVC_ST2",
                "Base Unit": "METER",
            },
            {
                "Product Code": "CBL-4C-16-CU",
                "Product Name / Size": "4CX16 SQMM 2XFY",
                "Cable Category": "LT_POWER",
                "Voltage Grade": "1.1KV",
                "Core Count": "4",
                "Cross Section (sq mm)": "16",
                "Conductor Material": "COPPER",
                "Insulation Type": "XLPE",
                "Armour Type": "STRIP_ARMOURED",
                "Outer Sheath": "PVC_ST2",
                "Base Unit": "METER",
            },
        ],
        transform: (row) => ({
            code: String(row["Product Code"] || row.code || "").trim(),
            name: String(row["Product Name / Size"] || row.name || "").trim(),
            cableCategory: String(row["Cable Category"] || row.cableCategory || "LT_POWER").trim().toUpperCase(),
            voltageGrade: String(row["Voltage Grade"] || row.voltageGrade || "1.1KV").trim().toUpperCase(),
            coreCount: parseInt(row["Core Count"] || row.coreCount || 4, 10),
            crossSectionSqMm: parseFloat(row["Cross Section (sq mm)"] || row.crossSectionSqMm || 35),
            conductorMaterial: String(row["Conductor Material"] || row.conductorMaterial || "ALUMINUM").trim().toUpperCase(),
            insulationType: String(row["Insulation Type"] || row.insulationType || "XLPE").trim().toUpperCase(),
            armourType: String(row["Armour Type"] || row.armourType || "STRIP_ARMOURED").trim().toUpperCase(),
            outerSheath: String(row["Outer Sheath"] || row.outerSheath || "PVC_ST2").trim().toUpperCase(),
            baseUnit: String(row["Base Unit"] || row.baseUnit || "METER").trim().toUpperCase(),
        }),
    },

    WAREHOUSES: {
        key: "WAREHOUSES",
        sheetName: "4_Warehouses",
        title: "Warehouses / Storage Locations",
        description: "Raw material stores, WIP shopfloor bays, quarantine yards, and finished goods yard.",
        endpoint: "/warehouses",
        bulkEndpoint: "/warehouses/import-bulk",
        fields: [
            { key: "code", label: "Warehouse Code", required: "MANDATORY", allowedValues: "Unique Code (e.g. WH-RM-01)", example: "WH-RM-01" },
            { key: "name", label: "Warehouse Name", required: "MANDATORY", allowedValues: "Facility Name", example: "Main Raw Material Warehouse" },
            { key: "type", label: "Type", required: "MANDATORY", allowedValues: "RAW_MATERIAL, WORK_IN_PROGRESS, FINISHED_GOODS, SCRAP, CUSTOMER_SUPPLIED, QUARANTINE", example: "RAW_MATERIAL" },
            { key: "location", label: "Location / Bay", required: "OPTIONAL", allowedValues: "Plant / Gate / Bay description", example: "Chopanki Plant - Gate 1" },
        ],
        sampleRows: [
            {
                "Warehouse Code": "WH-RM-01",
                "Warehouse Name": "Main Raw Material Store",
                "Type": "RAW_MATERIAL",
                "Location / Bay": "Chopanki Plant - Gate 1",
            },
            {
                "Warehouse Code": "WH-WIP-01",
                "Warehouse Name": "Production WIP Bay",
                "Type": "WORK_IN_PROGRESS",
                "Location / Bay": "Shop Floor - Line 1 to 4",
            },
            {
                "Warehouse Code": "WH-FG-01",
                "Warehouse Name": "Finished Goods Yard",
                "Type": "FINISHED_GOODS",
                "Location / Bay": "Chopanki Plant - Drum Yard",
            },
            {
                "Warehouse Code": "WH-SCRAP-01",
                "Warehouse Name": "Customer Returnable Scrap Yard",
                "Type": "SCRAP",
                "Location / Bay": "Rear Storage Bay C",
            },
        ],
        transform: (row) => ({
            code: String(row["Warehouse Code"] || row.code || "").trim(),
            name: String(row["Warehouse Name"] || row.name || "").trim(),
            type: String(row["Type"] || row.type || "RAW_MATERIAL").trim().toUpperCase(),
            location: String(row["Location / Bay"] || row.location || "").trim(),
        }),
    },

    CABLE_DRUMS: {
        key: "CABLE_DRUMS",
        sheetName: "5_Cable_Drums",
        title: "Cable Drums Master",
        description: "Customer returnable drums with RGP numbers and factory-owned packaging drums.",
        endpoint: "/drums",
        bulkEndpoint: "/drums/import-bulk",
        fields: [
            { key: "drumNumber", label: "Drum Number", required: "MANDATORY", allowedValues: "Unique Drum Barcode / Stencil No (e.g. DRUM-VMC-101)", example: "DRUM-VMC-101" },
            { key: "drumType", label: "Drum Type", required: "MANDATORY", allowedValues: "WOODEN, STEEL, PLASTIC", example: "WOODEN" },
            { key: "ownership", label: "Ownership", required: "MANDATORY", allowedValues: "CUSTOMER_SUPPLIED, FACTORY_OWNED", example: "CUSTOMER_SUPPLIED" },
            { key: "customerCode", label: "Customer Code", required: "RECOMMENDED (If Customer Supplied)", allowedValues: "Customer Code from Customers sheet (e.g. CUST-VMC-02)", example: "CUST-VMC-02" },
            { key: "refRgpNumber", label: "Ref RGP Number", required: "RECOMMENDED", allowedValues: "Returnable Gate Pass / Delivery Challan Ref", example: "RGP/2026/089" },
            { key: "drumSize", label: "Drum Size", required: "OPTIONAL", allowedValues: "Dimensions Flange x Barrel x Traverse (e.g. 44X16X24, 60X30X36)", example: "44X16X24" },
            { key: "tareWeightKg", label: "Tare Weight (Kg)", required: "OPTIONAL", allowedValues: "Empty drum weight in Kg (e.g. 120.0)", example: "120.0" },
        ],
        sampleRows: [
            {
                "Drum Number": "DRUM-VMC-101",
                "Drum Type": "WOODEN",
                "Ownership": "CUSTOMER_SUPPLIED",
                "Customer Code": "CUST-VMC-02",
                "Ref RGP Number": "RGP/2026/089",
                "Drum Size": "44X16X24",
                "Tare Weight (Kg)": "120.0",
            },
            {
                "Drum Number": "DRUM-VMC-102",
                "Drum Type": "WOODEN",
                "Ownership": "CUSTOMER_SUPPLIED",
                "Customer Code": "CUST-VMC-02",
                "Ref RGP Number": "RGP/2026/089",
                "Drum Size": "44X16X24",
                "Tare Weight (Kg)": "120.0",
            },
            {
                "Drum Number": "DRUM-HVL-201",
                "Drum Type": "STEEL",
                "Ownership": "CUSTOMER_SUPPLIED",
                "Customer Code": "CUST-HVL-01",
                "Ref RGP Number": "CH-HVL-8592",
                "Drum Size": "60X32X36",
                "Tare Weight (Kg)": "240.0",
            },
        ],
        transform: (row) => ({
            drumNumber: String(row["Drum Number"] || row.drumNumber || "").trim(),
            drumType: String(row["Drum Type"] || row.drumType || "WOODEN").trim().toUpperCase(),
            ownership: String(row["Ownership"] || row.ownership || "CUSTOMER_SUPPLIED").trim().toUpperCase(),
            customerCode: String(row["Customer Code"] || row.customerCode || "").trim(),
            refRgpNumber: String(row["Ref RGP Number"] || row.refRgpNumber || "").trim(),
            drumSize: String(row["Drum Size"] || row.drumSize || "44X16X24").trim(),
            tareWeightKg: parseFloat(row["Tare Weight (Kg)"] || row.tareWeightKg || 0) || 0,
            status: "AVAILABLE",
        }),
    },

    INBOUND_CHALLANS: {
        key: "INBOUND_CHALLANS",
        sheetName: "6_Inbound_Challans",
        title: "Inbound Delivery Challans (Paper Receipt Logs)",
        description: "Customer delivery challans with received quantities, rates, vehicle numbers, and LR refs.",
        endpoint: "/inbound-challans",
        bulkEndpoint: "/inbound-challans/import-bulk",
        fields: [
            { key: "customerChallanNumber", label: "Customer Challan Ref", required: "MANDATORY", allowedValues: "Challan number written on customer paperwork", example: "CH-HVL-8592" },
            { key: "customerChallanDate", label: "Challan Date (YYYY-MM-DD)", required: "MANDATORY", allowedValues: "Date in YYYY-MM-DD format (e.g. 2026-08-15)", example: "2026-08-15" },
            { key: "customerCode", label: "Customer Code", required: "MANDATORY", allowedValues: "Valid customer code from Customers sheet", example: "CUST-HVL-01" },
            { key: "warehouseCode", label: "Warehouse Code", required: "MANDATORY", allowedValues: "Receiving Warehouse code (e.g. WH-RM-01)", example: "WH-RM-01" },
            { key: "materialCode", label: "Raw Material Code", required: "MANDATORY", allowedValues: "Raw material code from Materials sheet", example: "RM-COP-8MM" },
            { key: "receivedQuantity", label: "Received Qty (Kg/Mtr)", required: "MANDATORY", allowedValues: "Numeric quantity received (e.g. 1500.00)", example: "1500.00" },
            { key: "unitRate", label: "Unit Rate (INR)", required: "OPTIONAL", allowedValues: "Declared rate per unit in INR", example: "780.00" },
            { key: "vehicleNumber", label: "Vehicle Number", required: "OPTIONAL", allowedValues: "Truck / Transporter vehicle number", example: "RJ02GB1234" },
            { key: "lrNumber", label: "LR Number", required: "OPTIONAL", allowedValues: "Lorry Receipt number from paper challan", example: "LR-8901" },
        ],
        sampleRows: [
            {
                "Customer Challan Ref": "CH-HVL-8592",
                "Challan Date (YYYY-MM-DD)": "2026-08-15",
                "Customer Code": "CUST-HVL-01",
                "Warehouse Code": "WH-RM-01",
                "Raw Material Code": "RM-COP-8MM",
                "Received Qty (Kg/Mtr)": "1500.00",
                "Unit Rate (INR)": "780.00",
                "Vehicle Number": "RJ02GB1234",
                "LR Number": "LR-8901",
            },
            {
                "Customer Challan Ref": "CH-VMC-9104",
                "Challan Date (YYYY-MM-DD)": "2026-08-18",
                "Customer Code": "CUST-VMC-02",
                "Warehouse Code": "WH-RM-01",
                "Raw Material Code": "RM-AL-EC",
                "Received Qty (Kg/Mtr)": "5000.00",
                "Unit Rate (INR)": "225.00",
                "Vehicle Number": "UP17BT0896",
                "LR Number": "LR-4421",
            },
            {
                "Customer Challan Ref": "CH-VMC-9104",
                "Challan Date (YYYY-MM-DD)": "2026-08-18",
                "Customer Code": "CUST-VMC-02",
                "Warehouse Code": "WH-RM-01",
                "Raw Material Code": "RM-XLPE-INS",
                "Received Qty (Kg/Mtr)": "3500.00",
                "Unit Rate (INR)": "145.00",
                "Vehicle Number": "UP17BT0896",
                "LR Number": "LR-4421",
            },
        ],
        transform: (row) => ({
            customerChallanNumber: String(row["Customer Challan Ref"] || row.customerChallanNumber || "").trim(),
            customerChallanDate: String(row["Challan Date (YYYY-MM-DD)"] || row.customerChallanDate || "").trim(),
            customerCode: String(row["Customer Code"] || row.customerCode || "").trim(),
            warehouseCode: String(row["Warehouse Code"] || row.warehouseCode || "").trim(),
            materialCode: String(row["Raw Material Code"] || row.materialCode || "").trim(),
            receivedQuantity: parseFloat(row["Received Qty (Kg/Mtr)"] || row.receivedQuantity || 0) || 0,
            unitRate: parseFloat(row["Unit Rate (INR)"] || row.unitRate || 0) || 0,
            vehicleNumber: String(row["Vehicle Number"] || row.vehicleNumber || "").trim(),
            lrNumber: String(row["LR Number"] || row.lrNumber || "").trim(),
        }),
    },
};

/**
 * Generate Master Multi-Sheet Excel Workbook for Complete System Import
 * Includes:
 * - 0_INDEX_&_CHOICES: Complete reference guide explaining mandatory vs optional fields and valid choices
 * - 1_Customers: Sample customers
 * - 2_Raw_Materials: Sample raw materials
 * - 3_Cable_Products: Sample cable products
 * - 4_Warehouses: Sample warehouses
 * - 5_Cable_Drums: Sample cable drums
 * - 6_Inbound_Challans: Sample inbound delivery challans
 */
export function exportMasterMultiSheetWorkbook() {
    const wb = XLSX.utils.book_new();

    // 1. Index and Choices Reference Sheet
    const indexRows = [
        {
            "Section / Sheet Name": "HOW TO USE THIS MASTER WORKBOOK",
            "Field Requirement Level": "INSTRUCTIONS FOR DATA ENTRY OPERATOR",
            "Allowed Values / Choices": "Fill in the sheets corresponding to your historical paper documents.",
            "Description / Explanation": "Each sheet has pre-filled sample rows. Mandatory fields MUST be provided.",
        },
        ...ALLOWED_CHOICES_DICTIONARY.map((dict) => ({
            "Section / Sheet Name": dict.Category,
            "Field Requirement Level": "SYSTEM STANDARD",
            "Allowed Values / Choices": dict.ValidValues,
            "Description / Explanation": `${dict.Description} (Default: ${dict.DefaultValue})`,
        })),
    ];
    const wsIndex = XLSX.utils.json_to_sheet(indexRows);
    XLSX.utils.book_append_sheet(wb, wsIndex, "0_INDEX_&_CHOICES");

    // 2. Add each entity sheet with its pre-filled sample rows and clear headers
    Object.values(IMPORT_TEMPLATES).forEach((tmpl) => {
        const ws = XLSX.utils.json_to_sheet(tmpl.sampleRows);
        XLSX.utils.book_append_sheet(wb, ws, tmpl.sheetName || tmpl.key);
    });

    // 3. Detailed Guidelines Sheet listing every field across all templates
    const allFieldGuidelines = [];
    Object.values(IMPORT_TEMPLATES).forEach((tmpl) => {
        tmpl.fields.forEach((f) => {
            allFieldGuidelines.push({
                "Data Category": tmpl.title,
                "Sheet Name": tmpl.sheetName || tmpl.key,
                "Column Header": f.label,
                "Requirement Level": f.required,
                "Allowed Formats / Choices": f.allowedValues || f.example,
                "Example Data": f.example,
            });
        });
    });
    const wsGuidelines = XLSX.utils.json_to_sheet(allFieldGuidelines);
    XLSX.utils.book_append_sheet(wb, wsGuidelines, "7_FIELD_GUIDELINES");

    const fileName = `MFOLKS_MASTER_DATA_IMPORT_WORKBOOK.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Download a single starter Excel template file pre-populated with example data and field notes
 */
export function exportSampleTemplate(templateKey) {
    const config = IMPORT_TEMPLATES[templateKey];
    if (!config) return;

    const wb = XLSX.utils.book_new();

    // 1. Data Sheet with sample rows
    const wsData = XLSX.utils.json_to_sheet(config.sampleRows);
    XLSX.utils.book_append_sheet(wb, wsData, config.sheetName || "Import_Data");

    // 2. Guidelines Sheet explaining every field & valid choices
    const guidelines = config.fields.map((f) => ({
        "Column Header": f.label,
        "Requirement Level": f.required,
        "Allowed Values / Choices": f.allowedValues || f.example,
        "Example Data": f.example,
    }));
    const wsGuide = XLSX.utils.json_to_sheet(guidelines);
    XLSX.utils.book_append_sheet(wb, wsGuide, "Field_Guidelines");

    // 3. Choices Reference Sheet
    const wsChoices = XLSX.utils.json_to_sheet(ALLOWED_CHOICES_DICTIONARY);
    XLSX.utils.book_append_sheet(wb, wsChoices, "Allowed_Choices");

    // Generate and download
    const fileName = `MFOLKS_Import_Template_${config.key}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Parse an uploaded Excel or CSV File into JSON rows.
 * If targetSheetName is provided, searches for that sheet or uses the first sheet.
 */
export async function parseImportFile(file, targetSheetName = null) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });

                // Find matching sheet or fallback to first sheet
                let chosenSheet = workbook.SheetNames[0];
                if (targetSheetName) {
                    const match = workbook.SheetNames.find(
                        (name) =>
                            name.toLowerCase() === targetSheetName.toLowerCase() ||
                            name.toLowerCase().includes(targetSheetName.toLowerCase())
                    );
                    if (match) chosenSheet = match;
                }

                // If user uploaded master workbook, try to match by template sheet name
                const worksheet = workbook.Sheets[chosenSheet];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                resolve({ rows: json, sheetName: chosenSheet, availableSheets: workbook.SheetNames });
            } catch (err) {
                reject(new Error(`Failed to parse file: ${err.message}`));
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}
