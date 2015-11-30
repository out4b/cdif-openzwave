Introduction
------------
CDIF's open zwave module implementation

The concept of Z-Wave's command class and values are similar to other open standards which categorized them into "services", "characteristics" or "state variables". So in this module's design we decide to map them respectively. E.g. the concept of command class would be equal to service, and value equal to state variable which is managed by the service. We use this to create the device model for Z-Wave based devices. After connected to the Z-Wave network, this module would listen to the Z-Wave library events and selectively emit device online event to CDIF.

Due to Z-Wave's low power design, commands are not guaranteed to always successfully deliver to device, for example battery powered devices may stay in sleep state for a long time and won't respond to any action or query command. In addition, in Z-Wave there is no guarantee of something similar to the "service discovery" process in other protocols, where controller can issue commands to fully explore a device's capabilities. Due to these facts, it seems the only reliable chance that a Z-Wave device to fully present its capability (e.g. supported command class and values) to the software stack is during the device inclusion stage, which is usually done by pressing the inclusion button on the device.

Because of these reasons, this module decides to save device node information, e.g. its serialized device model in persistent storage on node ready event, which will be triggered at inclusion stage. This information is indexed by node ID and loaded on framework startup. After this, when this module receives device event updates, device online event will be emitted to CDIF so client apps would be aware of its availability. By doing this, CDIF would be knowledgeable with the previously included Z-Wave devices and their capabilities, even if the framework is restarted or the gateway is rebooted.

See following links for more details: <br/>

[Common device interconnect framework](https://github.com/out4b/cdif)

[Open Z-Wave library](https://github.com/jperkin/node-openzwave)
