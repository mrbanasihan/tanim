const kafkaState = {
  producerReady: false,
  consumerReady: false,
  workerReady: false,
  lastError: null,
};

const setKafkaState = (patch) => {
  Object.assign(kafkaState, patch);
};

const getKafkaState = () => ({ ...kafkaState });

module.exports = {
  setKafkaState,
  getKafkaState,
};
