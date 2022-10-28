import knx from "knex";
import { sys } from "typescript";
import knexConfig from "./knexfile";
import BezierEasing from "bezier-easing";

const easing = BezierEasing(0.01, 0.57, 1, -0.21);

const randomString = () => {
  return Math.random().toString(16).substr(2, 20);
};

const generateIDs = (count: number) => {
  // random hex string of size 20
  return Array.from({ length: count }, randomString);
};

const knex = knx(knexConfig.development);

const generateData = async (
  nbMeters: number,
  nbSpots: number,
  nbYear: number
) => {
  await knex.raw("PRAGMA journal_mode = WAL");

  const spots = generateIDs(nbSpots);
  const meterID = generateIDs(nbMeters);

  // link all meterIDs to a spotID
  const mapMeter = new Map<string, { type: string; spotID: string }>();
  meterID.forEach((id) => {
    mapMeter.set(id, {
      spotID: spots[Math.floor(easing(Math.random()) * spots.length)],
      type: Math.random() > 0.5 ? "gas" : "elec",
    });
  });

  const nbMeasuresPerMeter = 365 * nbYear;

  await knex.transaction(async (trx) => {
    await trx("data").delete();

    // add nbMeasuresPerMeter for each meterID by batch of 100 meter
    for (let i = 0; i < meterID.length; i++) {
      const id = meterID[i];
      const { spotID, type } = mapMeter.get(id)!;
      const date = new Date(2021, 0, 1);

      for (let j = 0; j < nbMeasuresPerMeter; j++) {
        const measure = {
          meterID: id,
          date: date.toISOString().split("T")[0],
          value: Math.floor(Math.random() * 10000),
          unit: "Wh",
          type,
          spotID,
        };

        await trx("data").insert(measure);
        date.setDate(date.getDate() + 1);
      }

      if (i % 100 === 0) {
        console.log(
          `Inserted ${i} meters, count measure ${(i + 1) * nbMeasuresPerMeter}`
        );
      }
    }
  });

  console.log("Data generated successfully");
};

const getMeterMostUsed = async () => {
  const result = await knex("data")
    .select("spotID")
    .countDistinct("meterID as count")
    .groupBy("spotID")
    .orderBy("count", "desc")
    .limit(100);

  console.log(result);
};

const generateStats = (meterIDs: string[]) => {
  return knex("data")
    .select(
      knex.raw("strftime('%Y-%m-%d', date) as date"),
      knex.raw("total(value) as dayTotal"),
      knex.raw("avg(value) as dayAvg"),
      "spotID",
      "type",
      "unit"
    )
    .countDistinct("meterID as nbMeter")
    .whereIn("meterID", meterIDs)
    .groupBy("date", "spotID", "type")
    .orderBy([
      {
        column: "date",
      },
      {
        column: "spotID",
      },
      {
        column: "type",
      },
    ])
    .then((res) => {
      console.log(res);
    });
};

const getRandomMeters = async (nb: number) => {
  const result = (await knex("data")
    .select("meterID")
    .count("meterID as count")
    .groupBy("meterID")
    .orderByRaw("RANDOM()")
    .limit(nb)) as Array<{ meterID: string }>;

  return result.map((r) => r.meterID);
};

const main = async () => {
  try {
    // apply last migration
    await knex.migrate.latest();

    console.time("generateData");
    await generateData(5000, 2000, 3);
    console.timeEnd("generateData");

    console.time("getMeterMostUsed");
    await getMeterMostUsed();
    console.timeEnd("getMeterMostUsed");

    console.time("getRandomMeters");
    const randomMeters = await getRandomMeters(1000);
    console.log(randomMeters);
    console.timeEnd("getRandomMeters");

    console.time("generateStats");
    await generateStats(randomMeters);
    console.timeEnd("generateStats");
  } catch (error) {
    console.error(error);
  }

  process.exit(0);
};

main();
