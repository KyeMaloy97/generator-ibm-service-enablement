from ibm_cloud_env import IBMCloudEnv
from watson_developer_cloud import SpeechToTextV1

speech_to_text = SpeechToTextV1(
    username=IBMCloudEnv.getString('watson_speech_to_text_username'),
    password=IBMCloudEnv.getString('watson_speech_to_text_password'),
    x_watson_learning_opt_out=True)

def getService(app):
    return 'watson-speech-to-text', speech_to_text