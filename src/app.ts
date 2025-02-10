import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

// Todo: XSD validating

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
                address1: data.find(
                  (d: any) => d["cbc:Description"] === "from"
                )["cac:Location"]["cac:Address"]["cac:AddressLine"]["cbc:Line"],
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
                address1: data.find((d: any) => d["cbc:Description"] === "to")[
                  "cac:Location"
                ]["cac:Address"]["cac:AddressLine"]["cbc:Line"],
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
              },
              cargo: {
                unitamount:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"][
                    "cbc:TotalTransportHandlingUnitQuantity"
                  ],
                unit_id: {
                  $matchmode: "1",
                  "#text": "COL",
                },
                weight:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:GrossWeightMeasure"]["#text"],
                loadingmeter:
                  inputObject.Manifest["cac:Shipment"]["cac:Consignment"][
                    "cac:ConsolidatedShipment"
                  ]["cac:Consignment"]["cbc:LoadingLengthMeasure"]["#text"],
              },
              cod: {
                amount: inputObject.Manifest["cac:Shipment"][
                  "cac:FreightAllowanceCharge"
                ].reduce(
                  (sum: number, current: number) =>
                    sum + parseFloat(current["cbc:Amount"]["#text"]),
                  0
                ),
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
    fs.unlinkSync(`./src/input/${file}`);
  } catch (error) {
    console.error(`❌ Error generating output from: ${file}: `, error);
  }
};

readInputFiles();
