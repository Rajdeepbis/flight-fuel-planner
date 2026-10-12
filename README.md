# ✈ Flight Sim Fuel Planner

A simple web app that estimates fuel and flight time for airliners in flight simulators like **Microsoft Flight Simulator** and **X-Plane**.

Pick an aircraft, choose your departure and arrival airports, set your passengers and cargo, and it works out:

- **Block fuel** broken down into trip, contingency, alternate, final reserve, extra and taxi
- **Flight time** and ground speed (with headwind or tailwind)
- **Weights**: zero fuel, takeoff and landing weight, checked against the aircraft's limits
- **Warnings** if you're over MTOW, MLW, MZFW or tank capacity

Results can be shown in kg or lb.

## Aircraft included

ATR 72-600 · Airbus A320neo · Airbus A321neo · Boeing 737-800 · Airbus A330-300 · Boeing 787-9 · Airbus A350-900 · Boeing 777-300ER

## How it works

- Route distance is the great-circle distance between the two airports, plus 5% to allow for airways. You can also type a distance directly.
- Fuel burn per hour scales with the aircraft's weight, so heavier loads burn more fuel. The calculation repeats a few times because carrying fuel also adds weight.
- Reserves follow a common airline style: 5% contingency, fuel to an alternate airport, and 30 minutes of holding fuel.

The aircraft figures are approximate public values. This is a hobby tool for simulators and **must not be used for real-world flight planning**.

## Run it

No installation needed. Open `index.html` in any browser.

## Built with

Plain HTML, CSS and JavaScript. No frameworks or libraries.

## License

MIT
