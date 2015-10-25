class AstroPublish {
  constructor(name, collection){
    this._predicates = [];
    this._mongoRules = [];
    this._name = name;
    this._queries = [];
    this._collection = collection;
  }

  static defineMethod(type, name, fn){
    if(AstroPublish.prototype[name]){
      throw new Error('Already defined');
    }

    if(!_.contains(['predicate', 'mongoRule', 'query'], type)){
      throw new Error(`Such method type ${type} doesn\'t exist`);
    }

    let methods = {
      predicate: '_predicates',
      mongoRule: '_mongoRules',
      query: '_queries'
    };

    AstroPublish.prototype[ name ] = function(...args){
      this[ methods[type] ].push({
        fn,
        args
      });

      return this;
    };
  }

  apply(){
    let self = this;

    Meteor.publish(this._name, function(...args){
      let userId = this.userId;
      let query = compactMethods(self._queries, self, args, userId);
      let rules = compactMethods(self._mongoRules, self, args, userId);

      let allPredicatesPass = _.every(self._predicates, (predicate) => {
        return predicate.fn.call(self, ...predicate.args, userId) === true;
      });

      if(allPredicatesPass){
        return self._collection.find(query, rules);
      } else {
        this.ready();
      }
    });
  }
}

AP = AstroPublish;

function compactMethods(methods, astroPublish, args, userId){
  return _.reduce(methods, function(rules, rule){
    let fn = _.isFunction(rule.args[0]) ? rule.args[0] : rule.fn;
    return _.extend(rules, fn.call(astroPublish, ...args, userId));
  }, {});
}

Mongo.Collection.prototype.publish = function(name){
  if(!name){
    throw new Error('[AstroPublish] You have to specify the publish name');
  }

  return new AstroPublish(name, this);
};