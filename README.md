Introduction
------------
CDIF's open zwave module implementation

The concept of Z-Wave's command class and values are similar to other open standards which categorized them into "services", "characteristics" or "state variables". So in this module's design we decide to map them respectively. E.g. the concept of command class would be equal to service, and value equal to state variable which is managed by the service. We use this to create the device model for Z-Wave based devices. After connected to the Z-Wave network, this module would listen to the Z-Wave library events and selectively emit device online event to CDIF.

Due to Z-Wave's low power design, commands are not guaranteed to always successfully deliver to device, for example battery powered devices may stay in sleep state for a long time and won't respond to any action or query command. In addition, there is no guarantee of something similar to the "service discovery process" available in the other protocols, where controller can issue commands to fully explore a device's capabilities. Due to these facts, we believe the only reliable chance that a Z-Wave device to fully present its capability (e.g. supported command class and values) to the controller and the upper software stack is during the inclusion process. Therefore, this module decides to save device node information, e.g. its device model spec in persistent storage at device inclusion stage. These information are indexed by node ID and load to framework on startup. After this, when this module receives device event updates, device online event will be emitted to CDIF so client apps could be aware of the available devices. By doing this, CDIF would be knowledgeable with the previously included Z-Wave devices and their capabilities, even if it is restarted or the gateway is rebooted.

See following links for more details: <br/>

[Common device interconnect framework](https://github.com/out4b/cdif)

[Open Z-Wave library](https://github.com/jperkin/node-openzwave)
