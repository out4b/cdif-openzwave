Notes to CDIF's open zwave module implementation
---------------------------------------
The concept of Z-Wave's command class and values are similar to other open standards which categorized them into "services", "characteristics" or "state variables". So in this module's design we decide to map them respectively. E.g. the concept of command class would be equal to service, and value equal to state variable which is managed by the service. We use this to create the device model for Z-Wave based devices. After connected to the Z-Wave network, this module would listen to the Z-Wave library events and selectively emit device online event to CDIF.

Due to Z-Wave's low power design, commands are not guaranteed to always successfully deliver to device, for example battery powered devices may stay in sleep state for a long time and won't respond to any action or query command. In addition, in Z-Wave there is no guarantee of something similar to the "service discovery" process in other protocols, where controller can issue commands to fully explore a device's capabilities at one time. For battery powered devices, it could take hours to report its node info or new values. Due to these facts, this implementation would progressively build up device model specs whenever a new value or node info is reported through 'value add', 'value change', or 'node ready' event. This means a discovered device through CDIF's REST interface may automatically refresh its device model from time to time.

Since there is no reliable way to query a Z-Wave device for its latest status, this implementation would return CDIF's cached value to the client upon a read request. Value update is always reported with 'value change' event.

Limitations
-----------
At this time below Z-Wave features are not supported:
* Z-Wave association group and scene control
* Device polling



See following links for more details: <br/>

[Common device interconnect framework](https://github.com/out4b/cdif)

[Open Z-Wave library](https://github.com/jperkin/node-openzwave)
