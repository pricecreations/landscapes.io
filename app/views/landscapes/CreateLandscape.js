import React, { Component, PropTypes } from 'react'
import axios from 'axios'
import cx from 'classnames'
import { Row, Col } from 'react-flexbox-grid'
import Dropzone from 'react-dropzone'
import { IoCube } from 'react-icons/lib/io'
import IconButton from 'material-ui/IconButton'
import shallowCompare from 'react-addons-shallow-compare'
import UploadIcon from 'material-ui/svg-icons/file/file-upload'
import { Paper, RaisedButton, TextField } from 'material-ui'
import Snackbar from 'material-ui/Snackbar';
import AvatarCropper from "react-avatar-cropper";


import './landscapes.style.scss'
import { Loader } from '../../components'

class CreateLandscape extends Component {

    state = {
        animated: true,
        viewEntersAnim: true,
        successOpen: false,
        failOpen: false
    }

    componentDidMount() {
        const { enterLandscapes } = this.props
        enterLandscapes()
    }

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState)
    }

    componentWillUnmount() {
        const { leaveLandscapes } = this.props
        leaveLandscapes()
    }

    render() {

        const { animated, viewEntersAnim } = this.state
        const { loading, landscapes } = this.props

        if (loading) {
            return (
                <div className={cx({ 'animatedViews': animated, 'view-enter': viewEntersAnim })}>
                    <Loader/>
                </div>
            )
        }

        return (
            <Row center='xs' middle='xs' className={cx({ 'screen-height': true, 'animatedViews': animated, 'view-enter': viewEntersAnim })}>
            <Snackbar
              open={this.state.successOpen}
              message="Landscape successfully created."
              autoHideDuration={3000}
              onRequestClose={this.handleRequestClose}
            />
            <Snackbar
              open={this.state.failOpen}
              message="Error creating landscape."
              autoHideDuration={3000}
              onRequestClose={this.handleRequestClose}
            />
                <Col xs={6} lg={9} className={cx( { 'create-landscape': true } )}>
                    <Row middle='xs'>
                        <Col xs={4} style={{ textAlign: 'left' }}>
                            <h4>New Landscape</h4>
                        </Col>
                        <Col xs={8}>
                            <RaisedButton label='Save' onClick={this.handlesCreateClick}
                                style={{ float: 'right', margin: '30px 0px' }}
                                labelStyle={{ fontSize: '11px' }}/>
                        </Col>
                    </Row>
                    <Paper zDepth={1} rounded={false}>

                        <TextField id='name' ref='name' floatingLabelText='Name' maxLength={64} className={cx( { 'two-field-row': true } )}/>
                        <TextField id='version' ref='version' floatingLabelText='Version' className={cx( { 'two-field-row': true } )}/>

                        <TextField id='description' ref='description' multiLine={true} rows={4} floatingLabelText='Description'
                            fullWidth={true} floatingLabelStyle={{ left: '0px' }} textareaStyle={{ width: '95%' }}/>

                        <TextField id='infoLink' ref='infoLink' floatingLabelText='Info Link' fullWidth={true}/>
                        <TextField id='infoLinkText' ref='infoLinkText' floatingLabelText='Link Text' fullWidth={true}/>

                          <Dropzone id='imageUri' onDrop={this.handlesImageUpload} multiple={false} accept='image/*' style={{
                              marginLeft: '10px',
                              maxWidth: '100px',
                              padding: '15px 0px'
                          }}>
                              <div className="avatar-photo" >
                                  <div className="avatar-edit">
                                      <span>Click to Choose Image</span>
                                      <i className="fa fa-camera" style={{fontSize: 30}}></i>
                                  </div>
                                  <img src={this.state.croppedImg || this.state.imageUri}/>
                              </div>
                              {this.state.cropperOpen &&
                                <AvatarCropper onRequestHide={this.handleRequestHide} cropperOpen={this.state.cropperOpen} onCrop={this.handleCrop} image={this.state.img} width={400} height={400}/>
                              }
                          </Dropzone>

                        <Dropzone id='cloudFormationTemplate' onDrop={this.handlesTemplateClick} multiple={false}
                            style={{ width: '100%', height: 150, padding: '15px 0px' }}
                            activeStyle={{ border: 'limegreen 1px solid', width: '100%', padding: '15px 0px' }}>
                            {
                                this.state.cloudFormationTemplate
                                ?
                                    <textarea rows={100} style={{ background: '#f9f9f9', fontFamily: 'monospace', width: '100%' }}>{ this.state.cloudFormationTemplate }</textarea>
                                :
                                    <Row center='xs' middle='xs'>
                                        <Col style={{ marginTop: 25 }}>
                                            <IoCube size={42}/>
                                        </Col>
                                        <div style={{ fontSize: '12px', width: '100%', margin: '10px 0px' }}> Drop
                                            <strong style={{ fontSize: '12px' }}> JSON </strong> or
                                            <strong style={{ fontSize: '12px' }}> YAML </strong> file
                                        </div>
                                    </Row>
                            }
                        </Dropzone>
                    </Paper>
                </Col>
            </Row>
        )
    }
    getInitialState = () => {
        return {
          cropperOpen: false,
          img: null,
          croppedImg: defaultImage
        };
      }
      handleFileChange = (dataURI) => {
        this.setState({
          img: dataURI,
          croppedImg: this.state.croppedImg,
          cropperOpen: true
        });
      }
      handleCrop = (dataURI) => {
        this.setState({
          cropperOpen: false,
          img: null,
          croppedImg: dataURI
        });
      }
      handleRequestHide = () =>{
        this.setState({
          cropperOpen: false
        });
      }

    handlesImageUpload = (acceptedFiles, rejectedFiles) => {
        let reader = new FileReader()

        reader.readAsDataURL(acceptedFiles[0])
        reader.onload = () => {
            this.setState({
                imageUri: reader.result,
                img: reader.result,
                croppedImg: this.state.croppedImg,
                cropperOpen: true,
                imageFileName: acceptedFiles[0].name
            })
        }

        reader.onerror = error => {

        }
    }

    handlesTemplateClick = (acceptedFiles, rejectedFiles) => {

        let self = this
        let data = new FormData()

        data.append('file', acceptedFiles[0])

        axios.post('http://0.0.0.0:8080/api/upload/template', data).then(res => {
            self.setState({
                cloudFormationTemplate: JSON.stringify(res.data, null, 4)
            })
        }).catch(err => {
        })
    }

    handlesCreateClick = event => {
        event.preventDefault()
        const { mutate } = this.props
        const { router } = this.context

        let landscapeToCreate = {}
        // map all fields to landscapeToCreate
        for (let key in this.refs) {
            landscapeToCreate[key] = this.refs[key].getValue()
        }
        // attach imageUri and cloudFormationTemplate
        landscapeToCreate.imageUri = this.state.croppedImg || ''
        landscapeToCreate.cloudFormationTemplate = this.state.cloudFormationTemplate || ''
        if(!landscapeToCreate.version){
          landscapeToCreate.version = '1.0'
        }

        mutate({
            variables: { landscape: landscapeToCreate }
         }).then(({ data }) => {
            this.props.refetchLandscapes({}).then(({ data }) =>{
              this.setState({
                successOpen: true
              })

              router.push({ pathname: '/landscapes' })
            }).catch((error) => {
            })
        }).catch((error) => {
        })
    }

    closeError = (event) => {
        event.preventDefault()
        const { resetError } = this.props
        resetError()
    }
}

CreateLandscape.propTypes = {
    currentView: PropTypes.string.isRequired,
    enterLandscapes: PropTypes.func.isRequired,
    leaveLandscapes: PropTypes.func.isRequired,
    refetchLandscapes: PropTypes.func
}

CreateLandscape.contextTypes = {
    router: PropTypes.object
}

export default CreateLandscape
