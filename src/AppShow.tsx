import Button from '@material-ui/core/Button'
import { withStyles } from '@material-ui/core/styles'
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer'
import React from 'react'
import {
  crudUpdate,
  Edit,
  Loading,
  NumberInput,
  Query,
  SaveButton,
  Show,
  SimpleForm,
  SimpleShowLayout,
  TextField,
  Toolbar
} from 'react-admin'
import { connect } from 'react-redux'
import _ from 'lodash/fp'
import { App } from './api/apps'
import { Stats } from './api/stats'
import Chart from './Chart'
import logger from './logger'
import BackButton from './BackButton'

interface ShowProps {
  id: string
  basePath: string
  resource: string
}
interface ChartsProps {
  id: string
}
interface Error {
  message: string
}
export const Charts: React.FunctionComponent<ChartsProps> = (
  props
): React.ReactElement => {
  const { id } = props
  return (
    <Query type="GET_ONE" resource="stats" payload={{ id }}>
      {({
        data,
        loading,
        error
      }: {
        data: Stats
        loading: boolean
        error: Error
      }): React.ReactElement => {
        if (loading) {
          return <Loading />
        }
        if (error) {
          return <div>Error: {error.message}</div>
        }
        return (
          <div>
            <Chart data={data.data.mem} title="Memory (MB)" />
            <Chart data={data.data.cpu} title="CPU (Millicores)" />
          </div>
        )
      }}
    </Query>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const required = (message = 'Required') => (value: any) =>
  value ? undefined : message
const number = (message = 'Must be a number') => (value: any) =>
  // eslint-disable-next-line no-restricted-globals
  value && isNaN(Number(value)) ? message : undefined
const minValue = (min: number, message = 'Too small') => (value: any) =>
  value && value < min ? message : undefined
const maxValue = (max: number, message = 'Too big') => (value: any) =>
  value && value > max ? message : undefined
/* eslint-enable @typescript-eslint/no-explicit-any */

const validateSize = [
  required(),
  number(),
  minValue(0.2, 'Must be at least 0.2'),
  maxValue(16, 'Please contact enterprise@gigalixir.com to scale above 16.')
]
const validateReplicas = [
  number(),
  minValue(0, 'Must be non-negative'),
  maxValue(16, 'Please contact enterprise@gigalixir.com to scale above 16.')
]

interface ScaleProps {
  id: string
  basePath: string
  resource: string
  onSave: () => void
}
const AppScale = (props: ScaleProps) => {
  const { onSave, ...sanitizedProps } = props
  return (
    <Edit title=" " {...sanitizedProps}>
      <SimpleForm
        redirect={false}
        // AppScaleToolbar gets cloned so all the props here except onSave are really just to make the compiler happy..
        // sucks.
        toolbar={
          <AppScaleToolbar
            onSave={onSave}
            basePath=""
            redirect=""
            handleSubmit={() => {}}
          />
        }
      >
        <NumberInput source="size" validate={validateSize} />
        <NumberInput source="replicas" validate={validateReplicas} />
      </SimpleForm>
    </Edit>
  )
}

const scaleApp_ = (values: App, basePath: string, redirectTo: string) => {
  logger.debug('scaleApp')
  logger.debug(redirectTo)
  logger.debug(basePath)
  return crudUpdate('apps', values.id, values, undefined, basePath, redirectTo)
}

interface AppScaleToolbarProps {
  handleSubmit: (f: (values: App) => void) => void
  basePath: string
  redirect: string
  scaleApp: (values: App, basePath: string, redirect: string) => void
  onSave: () => void
}
const AppScaleToolbar_ = (props: AppScaleToolbarProps) => {
  const handleClick = () => {
    logger.debug('handleClick')
    const { handleSubmit, basePath, redirect, scaleApp, onSave } = props

    return handleSubmit((values: App) => {
      logger.debug(JSON.stringify(values))
      logger.debug('handleSubmit')
      onSave()
      scaleApp(values, basePath, redirect)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { scaleApp, onSave, ...sanitizedProps } = props

  return (
    <Toolbar {...sanitizedProps}>
      <SaveButton handleSubmitWithRedirect={handleClick} />
    </Toolbar>
  )
}
const AppScaleToolbar = connect(undefined, { scaleApp: scaleApp_ })(
  AppScaleToolbar_
)

const Setup = (props: { record: Record }) => {
  const {
    record: { id }
  } = props
  return <div>Instructions to set up {id}</div>
}

interface Record {
  id: string
  size: number
  replicas: number
  version: number
}

// TODO: I kinda hate that record is optional here, but otherwise, typescript
// forces us to put dummy parameters where this component is used below.
// This is because react-admin injects the record for us by cloning the element.
// I looked at react-admin's TextField component to see how they handle it and they
// just make it optional like this so we copy it.
const SetupOrShowLayout = (props: { record?: Record }) => {
  const { record } = props
  if (!record) {
    return <div>Oops, no record found. Please contact help@gigalixir.com</div>
  }
  const version = _.get('version', record)
  const id = _.get('id', record)
  if (version === 2) {
    return <Setup record={record} />
  }
  return (
    <SimpleShowLayout {...props}>
      <TextField source="id" />
      <TextField source="size" />
      <TextField source="replicas" />
      <TextField source="version" />
      <Charts id={id} />
    </SimpleShowLayout>
  )
}

const styles = {
  // list: {
  //   width: 250
  // },
  // fullList: {
  //   width: 'auto'
  // }
}

interface AppShowProps {
  id: string
  version: number
}
class AppShowBase extends React.Component<AppShowProps, { open: boolean }> {
  public constructor(props: AppShowProps) {
    super(props)
    this.state = { open: false }
  }

  public render() {
    const toggleDrawer = (open: boolean) => (
      event: React.KeyboardEvent | React.MouseEvent
    ) => {
      if (
        event &&
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return
      }

      this.setState({ open })
    }

    const { id } = this.props
    const { open } = this.state
    return (
      <>
        <BackButton />

        <Button
          onClick={toggleDrawer(true)}
          variant="contained"
          color="primary"
        >
          Scale
        </Button>

        <Show {...this.props}>
          <SetupOrShowLayout />
        </Show>
        <SwipeableDrawer
          anchor="right"
          open={open}
          onClose={toggleDrawer(false)}
          onOpen={toggleDrawer(true)}
        >
          <AppScale
            id={id}
            basePath="/apps"
            resource="apps"
            onSave={() => this.setState({ open: false })}
          />
        </SwipeableDrawer>
      </>
    )
  }
}

export const AppShow = withStyles(styles)(AppShowBase)
