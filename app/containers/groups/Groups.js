import gql from 'graphql-tag'
import { Groups } from '../../views'
import { connect } from 'react-redux'
import { graphql } from 'react-apollo'
import { bindActionCreators } from 'redux'
import * as viewsActions from '../../redux/modules/views'
import { auth } from '../../services/auth'

/* -----------------------------------------
  GraphQL - Apollo client
 ------------------------------------------*/

 let user = auth.getUserInfo() || {}

 const GroupQuery = gql `
     query getGroupsByUser($userId: String, $isGlobalAdmin: Boolean) {
         groupsByUser(id: $userId, isGlobalAdmin: $isGlobalAdmin ) {
             _id,
             name,
             users{
               isAdmin,
               userId
             },
             imageUri,
             description,
             landscapes,
             permissions
         }
     }

  `
 const GroupsQuery = gql `
     query getGroups {
         groups {
             _id,
             name,
             users{
               isAdmin,
               userId
             },
             imageUri,
             description,
             landscapes,
             permissions
         }
     }

  `
  const UsersQuery = gql `
      query getUsers {
          users {
            _id,
            username,
            profile,
            email,
            imageUri,
            firstName,
            lastName,
            role
          }
      }

   `
   const editUserMutation = gql `
       mutation updateUser($user: UserInput!) {
           updateUser(user: $user) {
               username
           }
       }
   `

 // 1- add queries:
 const GroupsWithQuery = graphql(GroupQuery, {
      options: { variables: { userId: user._id || '', isGlobalAdmin: (user.role === 'admin') || false } },
     props: ({ data: { loading, groupsByUser, refetch } }) => ({
         groupsByUser,
         loading,
         refetchGroupsByUser: refetch
     })
 })(graphql(GroupsQuery, {
     props: ({ data: { loading, groups, refetch } }) => ({
         groups,
         loading,
         refetchGroups: refetch
     })
 })(graphql(UsersQuery, {
     props: ({ data: { loading, users, refetch } }) => ({
         users,
         loading,
         refetchUsers: refetch
     })
 })(
   graphql(editUserMutation, {name: 'EditUserWithMutation'})
   (Groups))))


/* -----------------------------------------
  Redux
 ------------------------------------------*/

const mapStateToProps = state => {
    return { currentView: state.views.currentView }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        enterGroups: viewsActions.enterGroups,
        leaveGroups: viewsActions.leaveGroups
    }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(GroupsWithQuery)
