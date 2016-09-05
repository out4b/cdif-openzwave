Introduction
------------
CDIF's open zwave module implementation

The concepts of Z-Wave's command class and values are similar to other open standards which categories them into "services" and "characteristics" or "state variables". So in this module's design we decide to map them accordingly, e.g. command class equals to service, and a value equals to a state variable.

The only exception of this mapping is multiple instance command classes.

Due to Z-Wave's low power design, commands cannot not be garenteed to successfully deliver to device, for example battery powered sensors etc. So there is no garentee of something silimar to Bluetooth's "service discovery" concept where controller can issue command to fully explore a device's capabilities. Due to this, the only chance that a Z-Wave based device to present its full capability (e.g. supported command class and values) to controller and the upper software stack is during the inclusion process. Because of this, this module decides to cache device node information in persistent storage at inclusion stage.

See following links for more details: <br/>

[Common device interconnect framework](https://github.com/out4b/cdif)

[Open Z-Wave library](https://github.com/jperkin/node-openzwave)
