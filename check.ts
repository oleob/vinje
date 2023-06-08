import path from "path";
import { NotificationCenter } from "node-notifier";
import { addMilliseconds, intervalToDuration } from "date-fns";

type TicketResponse = { groups: any[]; offers: any[] };

const notificationCenterNotifier = new NotificationCenter({
  withFallback: true,
});

const baseUrl = "https://availability.ticketmaster.eu/api/v2/TM_NO/resale";
const ticketmasterUrl = "https://www.ticketmaster.no/artist/vinjerock-billetter/899820";
const ordinaryId = "703709";
const dntId = "705713";

const fetchTickets = async (id: string) => {
  const response = await fetch(`${baseUrl}/${id}`);

  const data: TicketResponse = await response.json();

  return data;
};

const hasTickets = (tickets: TicketResponse) => {
  return tickets.groups.length > 0 || tickets.offers.length > 0;
};

const sendNotification = (title: string, message: string, open?: string) => {
  notificationCenterNotifier.notify(
    {
      title,
      message,
      // icon: path.join(__dirname, 'vinje-logo.png'),
      contentImage: path.join(__dirname, "vinje-logo.png"),
      open,
      timeout: 10_000,
    },
    function (error, response, metadata) {
      if (error) {
        console.error(error, response, metadata);
      }
    }
  );
};

let nextUpdate: Date = new Date();

let alternate = 0;
const showTimeToNextUpdate = () => {
  alternate = (alternate + 1) % 2;
  const distance = intervalToDuration({ start: new Date(), end: nextUpdate });
  const text = `${alternate ? "⏳" : "⌛"} Next update in ${distance.minutes} minute${
    distance.minutes !== 1 ? "s" : ""
  } and ${distance.seconds} second${distance.seconds !== 1 ? "s" : ""}`;
  process.stdout.cursorTo(0);
  process.stdout.write(text);
};

let nextUpdateInterval: ReturnType<typeof setInterval>;
const checkForTickets = async () => {
  clearInterval(nextUpdateInterval);
  console.log("\n🔄 Checking for tickets...");
  try {
    const ordinaryTickets = await fetchTickets(ordinaryId);
    const dntTickets = await fetchTickets(dntId);

    const hasOrdinaryTickets = hasTickets(ordinaryTickets);
    const hasDNTTickets = hasTickets(dntTickets);
    if (hasOrdinaryTickets) {
      console.log("😱 Found ordinary tickets!");
      sendNotification(
        "Vinjerock",
        "😱 Vanlig billett tilgjengelig! Trykk for å komme til tickemaster",
        ticketmasterUrl
      );
    } else {
      console.log("😔 Found no ordinary tickets");
    }

    if (hasDNTTickets) {
      console.log("😱 Found DNT tickets!");
      sendNotification("Vinjerock", "😱 DNT-billett tilgjengelig! Trykk for å komme til tickemaster", ticketmasterUrl);
    } else {
      console.log("😔 Found no DNT tickets");
    }
  } catch (e) {
    console.error("💥Something went wrong💥", e);
  }

  const delay = Math.round(Math.random() * 1_000) * 60;
  const oneMinutesInMS = 1000 * 60;

  const timeToNextUpate = delay + oneMinutesInMS;

  nextUpdate = addMilliseconds(new Date(), timeToNextUpate);

  setTimeout(() => {
    checkForTickets();
  }, timeToNextUpate);

  nextUpdateInterval = setInterval(showTimeToNextUpdate, 1000);
};

sendNotification("Vinjerock", "Ser etter billetter alle 2ish minutter");
checkForTickets();
