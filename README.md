Introduction
------------
CDIF's open zwave module implementation

The concepts of Z-Wave's command class and values are similar to other open standards which categorized them into "services" and "characteristics" or "state variables". So in this module's design we decide to map them accordingly, e.g. command class equals to service, and a value equals to a state variable. And use this to create the device model for Z-Wave based devices.

The only exception in this mapping is some vendor extended configurable values may have multiple instances. In this case, a instance ID is assigned to the variable.

Due to Z-Wave's low power design, commands are not guaranteed to always successfully deliver to device, for example battery powered devices may in sleep state for a long time and won't respond to action commands. So there is no guarantee of something similar to Bluetooth's "service discovery process" where controller can issue command to fully explore a device's capabilities. And the only chance that a Z-Wave based device to present its full capability (e.g. supported command class and values) to controller and the upper software stack is during the inclusion process. Because of this, this module decides to cache device node information, e.g. its device model in persistent storage at inclusion stage. These information are indexed by node id (also acting as Z-Wave device's HW address) and load into framework on startup. By doing this framework would know a device's capabilities and listen to node removal event to delete the entries from storage.

See following links for more details: <br/>

[Common device interconnect framework](https://github.com/out4b/cdif)

[Open Z-Wave library](https://github.com/jperkin/node-openzwave)
