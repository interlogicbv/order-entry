import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

// Todo: XSD validating
const DEBUGGING = false;

// Default directories
const inputDirectory = "./src/input";
const outputDirectory = "./src/output";

const readInputFiles = () => {
  fs.readdir(inputDirectory, (error, files) => {
    // Error handling
    if (error) {
      console.error("❌ Error reading input directory: ", error);
      return;
    }
    // Filter XML files
    if (files.length > 0) {
      const xmlFiles = files.filter(
        (file) => path.extname(file).toLowerCase() === ".xml"
      );
      // Read XML files
      xmlFiles.forEach(async (file, index) => {
        const filePath = path.join(inputDirectory, file);
        try {
          // XML parser
          const parser = new XMLParser({
            ignoreAttributes: false,
          });
          // Read input file & parse
          const inputFile = await fs.promises.readFile(filePath, "utf8");
          let inputObject = parser.parse(inputFile);
          generateOutputFile(inputObject, file, index);
        } catch (error) {
          console.error(`❌ Error processing file: ${file}: `, error);
        }
      });
    } else {
      console.log("❌ No XML files found in input directory");
    }
  });
};

const generateOutputFile = (inputObject: any, file: string, index: number) => {
  try {
    // XML builder
    const builder = new XMLBuilder({
      attributeNamePrefix: "$",
      ignoreAttributes: ["unitCode"],
      format: true,
    });

    // Get pickup and delivery data
    let events = inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
      "cac:ConsolidatedShipment"
    ]["cac:ShipmentStage"].filter(
      (i: any) => i["cbc:ShipmentStageType"] === "planning"
    );

    let data;
    if (events.length === 1) {
      // Olny one event
      data = events[0]["cac:TransportEvent"];
    } else {
      // More than one event
      data = events.map((e: any) => e["cac:TransportEvent"]);
    }

    // Loading Address
    let loadingAddress1: string;
    let loadingAddress2: string;
    const loadingAddressData = data.find(
      (d: any) => d["cbc:Description"] === "from"
    )["cac:Location"]["cac:Address"]["cac:AddressLine"];
    if (Array.isArray(loadingAddressData)) {
      loadingAddress1 = loadingAddressData[0]["cbc:Line"];
      loadingAddress2 = loadingAddressData[1]["cbc:Line"];
    } else {
      loadingAddress1 = loadingAddressData["cbc:Line"];
    }

    // Unloading Address
    let unloadingAddress1: string;
    let unloadingAddress2: string;
    const unloadingAddressData = data.find(
      (d: any) => d["cbc:Description"] === "to"
    )["cac:Location"]["cac:Address"]["cac:AddressLine"];
    if (Array.isArray(unloadingAddressData)) {
      unloadingAddress1 = unloadingAddressData[0]["cbc:Line"];
      unloadingAddress2 = unloadingAddressData[1]["cbc:Line"];
    } else {
      unloadingAddress1 = unloadingAddressData["cbc:Line"];
    }

    const serviceLevel =
      inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
        "cac:ConsolidatedShipment"
      ]["cac:Consignment"]["cbc:ShippingPriorityLevelCode"];

    // Instructions
    const instructions =
      inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
        "cac:ConsolidatedShipment"
      ]["cac:Consignment"]["cbc:SpecialInstructions"];

    // Build the XML file
    const outputContent = builder.build({
      transportbookings: {
        transportbooking: {
          edireference:
            inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
              "cac:ConsolidatedShipment"
            ]["cbc:ID"],
          reference: `${inputObject.Manifest["cbc:ID"]} ${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cbc:ID"]}`,
          customer_id: {
            $matchmode: "1",
            "#text": "NEELEVAT",
          },
          shipments: {
            shipment: {
              edireference:
                inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                  "cac:ConsolidatedShipment"
                ]["cbc:ID"],
              reference: `${inputObject.Manifest["cbc:ID"]} ${inputObject.Manifest["cac:Shipment"]["cac:Consignment"]["cbc:ID"]}`,
              fixedprice: inputObject.Manifest["cac:Shipment"][
                "cac:FreightAllowanceCharge"
              ].reduce(
                (sum: number, current: number) =>
                  sum + parseFloat(current["cbc:Amount"]["#text"]),
                0
              ),
              pickupaddress: {
                reference: inputObject.Manifest["cac:Shipment"][
                  "cac:Consignment"
                ]["cac:ConsolidatedShipment"]["cac:Consignment"][
                  "cac:DocumentReference"
                ].find((d: any) => d["cbc:ID"]["#text"] === 101)[
                  "cbc:DocumentTypeCode"
                ],
                address_id: {
                  $matchmode: "11",
                  "#text": data.find(
                    (d: any) => d["cbc:Description"] === "from"
                  )["cac:Location"]["cbc:Name"],
                },
                name: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cac:Location"
                ]["cbc:Name"],
                date: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cbc:OccurrenceDate"
                ],
                time: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cbc:OccurrenceTime"
                ],
                address1: loadingAddress1,
                address2: loadingAddress2,
                zipcode: data.find((d: any) => d["cbc:Description"] === "from")[
                  "cac:Location"
                ]["cac:Address"]["cbc:PostalZone"],
                city_id: {
                  $matchmode: "4",
                  "#text": data.find(
                    (d: any) => d["cbc:Description"] === "from"
                  )["cac:Location"]["cac:Address"]["cbc:CityName"],
                },
                country_id: {
                  $matchmode: "2",
                  "#text": data.find(
                    (d: any) => d["cbc:Description"] === "from"
                  )["cac:Location"]["cac:Address"]["cac:Country"][
                    "cbc:IdentificationCode"
                  ],
                },
                driverinfo:
                  instructions !== undefined
                    ? Array.isArray(instructions)
                      ? instructions.join(" / ")
                      : instructions
                    : null,
                remarks:
                  instructions !== undefined
                    ? Array.isArray(instructions)
                      ? instructions.join(" / ")
                      : instructions
                    : null,
              },
              deliveryaddress: {
                reference: inputObject.Manifest["cac:Shipment"][
                  "cac:Consignment"
                ]["cac:ConsolidatedShipment"]["cac:Consignment"][
                  "cac:DocumentReference"
                ].find((d: any) => d["cbc:ID"]["#text"] === 103)[
                  "cbc:DocumentTypeCode"
                ],
                address_id: {
                  $matchmode: "11",
                  "#text": data.find((d: any) => d["cbc:Description"] === "to")[
                    "cac:Location"
                  ]["cbc:Name"],
                },
                name: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cac:Location"
                ]["cbc:Name"],
                date: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cbc:OccurrenceDate"
                ],
                time: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cbc:OccurrenceTime"
                ],
                fixeddate: Array.isArray(serviceLevel)
                  ? serviceLevel.includes("FON")
                  : serviceLevel !== undefined
                  ? serviceLevel === "FON"
                  : false,
                address1: unloadingAddress1,
                address2: unloadingAddress2,
                zipcode: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cac:Location"
                ]["cac:Address"]["cbc:PostalZone"],
                city_id: {
                  $matchmode: "4",
                  "#text": data.find((d: any) => d["cbc:Description"] === "to")[
                    "cac:Location"
                  ]["cac:Address"]["cbc:CityName"],
                },
                country_id: {
                  $matchmode: "2",
                  "#text": data.find((d: any) => d["cbc:Description"] === "to")[
                    "cac:Location"
                  ]["cac:Address"]["cac:Country"]["cbc:IdentificationCode"],
                },
                driverinfo:
                  instructions !== undefined
                    ? Array.isArray(instructions)
                      ? instructions.join(" / ")
                      : instructions
                    : null,
                remarks:
                  instructions !== undefined
                    ? Array.isArray(instructions)
                      ? instructions.join(" / ")
                      : instructions
                    : null,
              },
              cargo: {
                unitamount:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"][
                    "cbc:TotalTransportHandlingUnitQuantity"
                  ] ||
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:TotalGoodsItemQuantity"]["#text"],
                unit_id: {
                  $matchmode: "1",
                  "#text":
                    inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                      "cac:ConsolidatedShipment"
                    ]["cac:Consignment"]["cbc:HandlingInstructions"].includes(
                      "PALLRUILLD:true"
                    ) ||
                    inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                      "cac:ConsolidatedShipment"
                    ]["cac:Consignment"]["cbc:HandlingInstructions"].includes(
                      "PALLRUILLS:true"
                    )
                      ? "Euro"
                      : "COL",
                },
                weight:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:GrossWeightMeasure"]["#text"],
                loadingmeter:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:LoadingLengthMeasure"]["#text"],
                // Kooiaap
                bool1: inputObject.Manifest["cac:Shipment"][
                  "cac:FreightAllowanceCharge"
                ]
                  .map((i: any) => i["cbc:AllowanceChargeReasonCode"])
                  .includes(238),
                // Laadklep
                bool2: inputObject.Manifest["cac:Shipment"][
                  "cac:FreightAllowanceCharge"
                ]
                  .map((i: any) => i["cbc:AllowanceChargeReasonCode"])
                  .includes(144),
                // Pallet ruil
                bool3:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:HandlingInstructions"].includes(
                    "PALLRUILLD:true"
                  ) ||
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:HandlingInstructions"].includes(
                    "PALLRUILLS:true"
                  ),
                // ADR
                adrclass_id: {
                  $matchmode: "3",
                  "#text": inputObject.Manifest["cac:Shipment"][
                    "cac:FreightAllowanceCharge"
                  ]
                    .map((i: any) => i["cbc:AllowanceChargeReasonCode"])
                    .includes(176)
                    ? "ADR"
                    : "",
                },
              },
            },
          },
        },
      },
    });
    // Generate output file
    const ref = new Date().getTime();
    const outputPath = path.resolve(`${outputDirectory}/${ref}-${index}.xml`);
    fs.writeFileSync(outputPath, outputContent);
    console.log(`✅ Successfully generated: ${ref}-${index}.xml`);
    data = [];
    events = [];
    !DEBUGGING ? fs.unlinkSync(`./src/input/${file}`) : null;
  } catch (error) {
    console.error(`❌ Error generating output from: ${file}: `, error);
  }
};

readInputFiles();
